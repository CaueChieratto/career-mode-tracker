/**
 * Remove recursivamente todas as propriedades com valor `undefined` de objetos e arrays
 * para garantir compatibilidade estrita com o Google Cloud Firestore e evitar o erro:
 * "FirebaseError: Function ... called with invalid data. Unsupported field value: undefined".
 *
 * Preserva instâncias de Date, tipos primitivos, null e objetos especiais do Firestore (como FieldValue).
 */
export function sanitizeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== "object") {
    return data;
  }

  if (data instanceof Date) {
    return data;
  }

  if (Array.isArray(data)) {
    return data
      .map((item) => sanitizeFirestoreData(item))
      .filter((item) => item !== undefined) as unknown as T;
  }

  // Verifica se é um objeto literal/plano (não uma classe do SDK como FieldValue)
  const proto = Object.getPrototypeOf(data);
  const isPlainObject = proto === Object.prototype || proto === null;

  if (!isPlainObject) {
    return data;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const sanitizedValue = sanitizeFirestoreData(value);
      if (sanitizedValue !== undefined) {
        result[key] = sanitizedValue;
      }
    }
  }

  return result as T;
}

