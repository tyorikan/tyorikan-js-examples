import { NextResponse } from 'next/server';

interface Material {
  id: number;
  name: string;
  quantity: number;
  unit: string;
}

interface MenuGenerationRequest {
  materials: Material[];
  timeOfDay: '朝' | '昼' | '晩';
}

interface GeneratedMenu {
  menuName: string;
  recipe: string[];
  aiGeneratedImageUrl: string;
}

export async function POST(request: Request) {
  try {
    const body: MenuGenerationRequest = await request.json();
    const { materials, timeOfDay } = body;

    // ダミーデータ生成ロジック
    const menuName = `AI生成 ${timeOfDay}のスペシャルメニュー`;
    const recipe = [
      `材料を混ぜ合わせます (材料: ${materials.map(m => m.name).join(', ')})`,
      `いい感じに調理します`,
      `美味しくいただきます!`
    ];
    const aiGeneratedImageUrl = '/images/dummy_ai_image.png'; //  /publicディレクトリにダミー画像を配置

    const generatedMenu: GeneratedMenu = {
      menuName,
      recipe,
      aiGeneratedImageUrl,
    };

    return NextResponse.json(generatedMenu);

  } catch (error) {
    console.error("Error processing POST request:", error);
    return new NextResponse(JSON.stringify({ message: "Failed to generate menu." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
