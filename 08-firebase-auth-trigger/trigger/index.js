// functions/index.js (using @google-cloud/functions-framework)

const functions = require('@google-cloud/functions-framework');
const protobuf = require('protobufjs');
const { PubSub } = require('@google-cloud/pubsub');

// Firebase Admin SDKはここでは直接使用しませんが、
// PubSubクライアントは @google-cloud/pubsub を使用します。
const pubsubClient = new PubSub();

// Pub/Subトピック名 (事前に作成しておく必要があります)
const TOPIC_NAME = process.env.TOPIC_NAME;
// const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT; // 通常、GCP環境では自動的に解決されます

functions.cloudEvent('createPubSubSubscriptionOnNewUser', async cloudEvent => {
  console.log(`Function triggered by event on: ${cloudEvent.source}`); // 例: //firestore.googleapis.com/projects/YOUR_PROJECT_ID/databases/(default)/documents/users/USER_ID
  console.log(`Event type: ${cloudEvent.type}`); // 例: google.cloud.firestore.document.v1.created
  console.log(`Event subject: ${cloudEvent.subject}`); // 例: documents/users/USER_ID
  console.log(`Event ID: ${cloudEvent.id}`);
  console.log(`Event time: ${cloudEvent.time}`);

  // Firestoreの 'users' コレクションのドキュメント作成イベントのみを処理することを想定
  // Eventarcトリガー側で、対象のイベントタイプとパスを正確にフィルタリングすることが推奨されます。
  // 例: google.cloud.firestore.document.v1.created
  //     リソースパス: projects/YOUR_PROJECT_ID/databases/(default)/documents/users/{userId}
  if (!cloudEvent.type || !cloudEvent.type.includes('firestore.document.v1.created')) {
      console.warn(`Received event of type ${cloudEvent.type}, but this function is designed for 'created' events. Skipping if not a create event.`);
      // 必要に応じて、ここで処理を中断するか、より厳密なタイプチェックを行う
      // return; // イベントタイプが期待と異なる場合は処理を終了
  }

  let userId;
  let firestoreValue; // To store decoded new value

  try {
    // userId を event.subject から抽出することを試みる (例: "documents/users/USER_ID")
    if (cloudEvent.subject) {
        const subjectParts = cloudEvent.subject.split('/');
        // usersコレクションのドキュメントであることを確認
        if (subjectParts.length > 0 && subjectParts[subjectParts.length - 2] === 'users') {
            userId = subjectParts[subjectParts.length - 1];
            console.log(`Extracted userId from subject: ${userId}`);
        }
    }

    // cloudEvent.data (protobuf) のデコード処理
    // data.proto ファイルが関数のルートディレクトリに存在する必要があります。
    console.log('Loading protos (data.proto)...');
    const root = await protobuf.load('data.proto'); // 'data.proto' がデプロイパッケージに含まれていることを確認
    const DocumentEventData = root.lookupType(
      'google.events.cloud.firestore.v1.DocumentEventData'
    );

    console.log('Decoding cloudEvent.data...');
    const firestoreReceived = DocumentEventData.decode(cloudEvent.data);
    // console.log('Decoded DocumentEventData:', JSON.stringify(firestoreReceived, null, 2));


    if (firestoreReceived.value && firestoreReceived.value.fields) {
        // 新しいドキュメントの値 (デコード後)
        // console.log('\nNew value (raw):');
        // console.log(JSON.stringify(firestoreReceived.value, null, 2));
        firestoreValue = firestoreReceived.value; // Keep for potential future use
    } else {
        console.warn('New value (firestoreReceived.value.fields) is missing in the event data.');
    }

    // userIdがsubjectから取得できなかった場合、ドキュメント名から再度試みる
    if (!userId && firestoreReceived.value && firestoreReceived.value.name) {
        // firestoreReceived.value.name は "projects/PROJECT_ID/databases/(default)/documents/users/USER_ID" のような形式
        const nameParts = firestoreReceived.value.name.split('/');
        if (nameParts.length > 0 && nameParts[nameParts.length - 2] === 'users') {
           userId = nameParts[nameParts.length - 1];
           console.log(`Extracted userId from decoded data (value.name): ${userId}`);
        }
    }

    if (!userId) {
        console.error('Failed to determine userId from the event. Cannot proceed with Pub/Sub subscription creation.');
        return; // userIdがなければSubscriptionは作成できない
    }

  } catch (protoError) {
      console.error('Error loading/decoding protobuf for Firestore event data:', protoError);
      console.error('Ensure "data.proto" is included in the deployment package and cloudEvent.data is a valid protobuf buffer.');
      return; // プロトコルバッファの処理に失敗した場合は終了
  }

  // --- ここからPub/Sub Subscription作成ロジック ---
  // Subscription名の生成
  // 制約: 3〜255文字、英数字、ダッシュ(-)、ピリオド(.)、アンダースコア(_)、チルダ(~)のみ。先頭は英字。
  const subscriptionName = `user-sub-${userId.replace(/[^a-zA-Z0-9-_.~]/g, '_').substring(0, 200)}`;
  console.log(`Attempting to create/verify subscription: "${subscriptionName}" for topic: "${TOPIC_NAME}" for user: "${userId}"`);

  try {
      const topic = pubsubClient.topic(TOPIC_NAME);
      const subscription = topic.subscription(subscriptionName);

      const [exists] = await subscription.exists();
      if (exists) {
          console.log(`Subscription "${subscriptionName}" for user "${userId}" already exists. No action needed.`);
          return; // 冪等性の確保
      }

      console.log(`Subscription "${subscriptionName}" does not exist. Creating...`);
      await topic.createSubscription(subscriptionName, {
          ackDeadlineSeconds: 60,
          retainAckedMessages: false,
          messageRetentionDuration: { seconds: 60 * 60 * 24 * 7 }, // 7日間
          // pushConfig: null, // Pull型の場合は明示的にnullまたは未指定
      });

      console.info(`Successfully created Pub/Sub subscription: "${subscriptionName}" for user "${userId}" on topic "${TOPIC_NAME}".`);

      // (オプション) Subscription作成成功後、Firestoreなどにステータスを更新する処理
      // この場合、@google-cloud/firestore クライアントと適切な権限が必要になります。
      // 例:
      // const { Firestore } = require('@google-cloud/firestore');
      // const firestore = new Firestore();
      // await firestore.doc(`users/${userId}`).update({
      //   pubsubSubscriptionStatus: 'created',
      //   subscriptionName: subscriptionName
      // });

  } catch (error) {
      if (error.code === 6) { // Pub/Sub APIエラーコード 6: ALREADY_EXISTS
          console.warn(`Subscription "${subscriptionName}" for user "${userId}" likely already exists (caught by createSubscription). Error: ${error.message}`);
      } else {
          console.error(`Failed to create Pub/Sub subscription for user "${userId}". Error code: ${error.code}, Message: ${error.message}`, error);
          // Eventarcによるリトライを期待する場合はエラーを再スロー
          // リトライさせたくない特定のエラーの場合は、ここでキャッチして再スローしない
          throw error;
      }
  }
});
