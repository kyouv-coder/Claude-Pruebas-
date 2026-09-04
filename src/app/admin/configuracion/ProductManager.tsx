"use client";

import { useState, useTransition, useActionState } from "react";
import {
  createProductAction,
  updateProductAction,
  toggleProductActiveAction,
  uploadProductImageAction,
  type ActionState,
} from "./actions";
import { FormField, FormError, FormSuccess, inputClass } from "@/components/FormField";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  active: boolean;
  imageMimeType: string | null;
};

const initialState: ActionState = {};

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export function ProductManager({ products }: { products: Product[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surface border border-border rounded-lg p-5 max-w-md">
        <h3 className="text-sm font-medium text-ink mb-3">Nuevo producto</h3>
        <ProductForm />
      </div>
      <div className="bg-surface border border-border rounded-lg divide-y divide-border">
        {products.length === 0 && (
          <p className="text-sm text-muted p-4">
            Todavía no hay productos cargados.
          </p>
        )}
        {products.map((p) => (
          <ProductRow key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

function ProductForm({
  product,
  onDone,
}: {
  product?: Product;
  onDone?: () => void;
}) {
  const action = product ? updateProductAction : createProductAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const idSuffix = product?.id ?? "new";

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      {product && <input type="hidden" name="id" value={product.id} />}
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <FormField label="Nombre" htmlFor={`prod-name-${idSuffix}`} required>
        <input
          id={`prod-name-${idSuffix}`}
          name="name"
          defaultValue={product?.name}
          required
          className={inputClass}
        />
      </FormField>
      <FormField label="Descripción" htmlFor={`prod-desc-${idSuffix}`}>
        <textarea
          id={`prod-desc-${idSuffix}`}
          name="description"
          defaultValue={product?.description ?? ""}
          rows={2}
          placeholder="Qué es, para qué sirve, de qué está hecho…"
          className={inputClass}
        />
      </FormField>
      <div className="flex gap-2">
        <FormField label="Precio" htmlFor={`prod-price-${idSuffix}`} required>
          <input
            id={`prod-price-${idSuffix}`}
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product?.price}
            required
            className={inputClass}
          />
        </FormField>
        <FormField label="Stock" htmlFor={`prod-stock-${idSuffix}`} required>
          <input
            id={`prod-stock-${idSuffix}`}
            name="stock"
            type="number"
            min="0"
            step="1"
            defaultValue={product?.stock ?? 0}
            required
            className={inputClass}
          />
        </FormField>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Guardando…" : product ? "Guardar cambios" : "Crear producto"}
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="text-sm text-muted hover:text-ink px-3 py-2"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function ProductRow({ product }: { product: Product }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="p-4">
        <ProductForm product={product} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {product.imageMimeType ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagen servida por una API propia, no un dominio remoto configurable
          <img
            src={`/admin/configuracion/imagen-producto/${product.id}`}
            alt=""
            className="w-12 h-12 rounded-md object-cover border border-border shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-md bg-accent-soft shrink-0" aria-hidden="true" />
        )}
        <div className="text-sm">
          <div
            className={`font-medium ${
              product.active ? "text-ink" : "text-muted line-through"
            }`}
          >
            {product.name}
          </div>
          <div className={product.stock === 0 ? "text-danger" : "text-muted"}>
            {money(product.price)} · {product.stock} en stock
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ProductImageUpload productId={product.id} />
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-accent hover:underline"
        >
          Editar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              toggleProductActiveAction(product.id, !product.active);
            })
          }
          className={`text-xs hover:underline disabled:opacity-50 ${
            product.active ? "text-danger" : "text-success"
          }`}
        >
          {product.active ? "Desactivar" : "Activar"}
        </button>
      </div>
    </div>
  );
}

function ProductImageUpload({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState(uploadProductImageAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-1">
      <input type="hidden" name="id" value={productId} />
      <label htmlFor={`prod-img-${productId}`} className="sr-only">
        Foto del producto
      </label>
      <input
        id={`prod-img-${productId}`}
        name="image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="text-xs max-w-[7rem]"
      />
      <button
        type="submit"
        disabled={pending}
        className="text-xs text-accent hover:underline disabled:opacity-50"
      >
        {pending ? "Subiendo…" : "Subir foto"}
      </button>
      {state.error && (
        <span role="alert" className="text-danger text-xs">
          {state.error}
        </span>
      )}
    </form>
  );
}
