export async function geocode(address: string): Promise<{ latitude: number; longitude: number } | null> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`);
  if (!res.ok) {
    return null;
  }
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }
  return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
}
