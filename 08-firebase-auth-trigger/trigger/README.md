## Eventarc Trigger の作成例
```bash
gcloud eventarc triggers create create-pubsub-subscription-on-new-user \
  --location=asia-northeast1 \
  --destination-run-service=create-pubsub-subscription-on-new-user \
  --destination-run-region=asia-northeast1 \
  --event-filters="type=google.cloud.firestore.document.v1.created" \
  --event-filters="database=(default)" \
  --event-filters-path-pattern="document=users/{uid}" \
  --service-account=${GOOGLE_CLOUD_PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
  --event-data-content-type="application/protobuf" \
  --destination-run-path="/createPubSubSubscriptionOnNewUser" 
```