"use client";
import { useState } from 'react';
import styles from './SuggestMenu.module.css'; // Import the CSS module

interface Material {
  id: number;
  name: string;
  quantity: number;
  unit: string;
}

interface GeneratedMenu {
  menuName: string;
  recipe: string[];
  aiGeneratedImageUrl: string;
}

export default function SuggestMenu() {
  const [materials, setMaterials] = useState<Material[]>([
    { id: 1, name: '牛肉', quantity: 200, unit: 'g' },
    { id: 2, name: '玉ねぎ', quantity: 1, unit: '個' },
  ]);
  const [timeOfDay, setTimeOfDay] = useState<'朝' | '昼' | '晩'>('昼');
  const [generatedMenu, setGeneratedMenu] = useState<GeneratedMenu | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddMaterial = () => {
    setMaterials([
      ...materials,
      { id: Date.now(), name: '', quantity: 1, unit: '個' },
    ]);
  };

  const handleRemoveMaterial = (id: number) => {
    setMaterials(materials.filter((material) => material.id !== id));
  };


  const handleMaterialChange = (
    id: number,
    field: keyof Omit<Material, 'id'>,
    value: string | number
  ) => {
    const newMaterials = materials.map((material) =>
      material.id === id ? { ...material, [field]: value } : material
    );
    setMaterials(newMaterials);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null); // Reset error message

    try {
      const response = await fetch('/api/suggests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ materials, timeOfDay }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate menu');
      }

      const data: GeneratedMenu = await response.json();
      setGeneratedMenu(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred');
      setGeneratedMenu(null);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>AI Menu Suggester</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div>
          <label htmlFor="timeOfDay">Time of Day:</label>
          <select
            id="timeOfDay"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value as '朝' | '昼' | '晩')}
          >
            <option value="朝">朝</option>
            <option value="昼">昼</option>
            <option value="晩">晩</option>
          </select>
        </div>

        <div>
          <label>Materials:</label>
          <div className={styles.materialsContainer}>
            {materials.map((material) => (
              <div key={material.id} className={styles.materialItem}>
                <input
                  type="text"
                  value={material.name}
                  placeholder="Material Name"
                  onChange={(e) =>
                    handleMaterialChange(material.id, 'name', e.target.value)
                  }
                />
                <input
                  type="number"
                  value={material.quantity}
                  placeholder="Quantity"
                  onChange={(e) =>
                    handleMaterialChange(
                      material.id,
                      'quantity',
                      Number(e.target.value)
                    )
                  }
                />
                <input
                  type="text"
                  value={material.unit}
                  placeholder="Unit"
                  onChange={(e) =>
                    handleMaterialChange(material.id, 'unit', e.target.value)
                  }
                />
                <button
                  type="button"
                  onClick={() => handleRemoveMaterial(material.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={handleAddMaterial}>
            Add Material
          </button>
        </div>

        <div className={styles.buttons}>
          <button type="submit" className={styles.button}>Generate Menu</button>
        </div>
      </form>

      {error && <p className={styles.error}>Error: {error}</p>}

      {generatedMenu && (
        <div className={styles.generatedMenu}>
          <h2>Generated Menu</h2>
          <p>Menu Name: {generatedMenu.menuName}</p>
          <h3>Recipe:</h3>
          <ul>
            {generatedMenu.recipe.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ul>
          <img src={generatedMenu.aiGeneratedImageUrl} alt="AI Generated Menu" />
        </div>
      )}
    </div>
  );
}
