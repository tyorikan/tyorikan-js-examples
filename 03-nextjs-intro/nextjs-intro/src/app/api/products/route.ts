import { NextResponse } from 'next/server';

// 製品情報の型定義
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

// 製品情報のサンプルデータ
const products: Product[] = [
  {
    id: 1,
    name: 'Awesome T-Shirt',
    description: 'A stylish and comfortable t-shirt.',
    price: 25,
    imageUrl: '/images/t-shirt.jpg', // 例：publicディレクトリに画像がある場合
  },
  {
    id: 2,
    name: 'Cool Mug',
    description: 'A perfect mug for your morning coffee.',
    price: 12,
    imageUrl: '/images/mug.jpg', // 例：publicディレクトリに画像がある場合
  },
  {
    id: 3,
    name: 'Fancy Hat',
    description: 'A trendy hat to complete your look.',
    price: 30,
    imageUrl: '/images/hat.jpg', // 例：publicディレクトリに画像がある場合
  },
];

export async function GET() {
  return NextResponse.json(products);
}
