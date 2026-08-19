'use client';

import { useState, useRef } from 'react';

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string) => void;
}

// Definimos las constantes de entorno fuera del componente para que sean globales
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export default function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // Validación de configuración
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setError('Cloudinary no está configurado en .env.local');
      console.error('ImageUpload Error: Faltan variables de Cloudinary');
      return;
    }

    // Validaciones de archivo
    if (!file.type.startsWith('image/')) {
      setError('El archivo tiene que ser una imagen.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede pesar más de 5MB.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Cloudinary API Error:', errorData);
        throw new Error('Error al subir la imagen a Cloudinary');
      }

      const data = await res.json();
      // Llamamos a onChange con la URL segura que nos devuelve Cloudinary
      onChange(data.secure_url);
    } catch (err) {
      console.error('Upload Exception:', err);
      setError('No se pudo subir la imagen. Probá de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {/* Input de archivo oculto, disparado por los botones */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        disabled={uploading}
      />

      {/* UI Condicional: Si hay imagen, mostramos vista previa. Si no, botón de agregar. */}
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt="Vista previa del producto" className="h-16 w-16 rounded-lg border border-[var(--border)] object-cover" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--surface-hover)] transition"
          >
            {uploading ? 'Subiendo…' : 'Cambiar foto'}
          </button>
          {/* Opcional: Botón para borrar la imagen si ya no se quiere
          <button type="button" onClick={() => onChange('')} className="text-xs text-neutral-500 hover:text-red-500">Quitar</button> 
          */}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-lg border-2 border-dashed border-[var(--border)] px-4 py-3 text-sm text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text)] transition"
        >
          {uploading ? 'Subiendo…' : '+ Agregar foto'}
        </button>
      )}

      {/* Mensaje de error */}
      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}