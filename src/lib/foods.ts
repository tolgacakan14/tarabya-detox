// Approximate values per typical portion (Turkish home and street food).
// Source: research reports + TÜRKOMP-style estimates. Recipes vary ±20-30%.
export interface Food {
  id: string;
  name: string;
  portion: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: string[]; // "dense" good for gain, "light" good for loss, "protein"
}

export const FOODS: Food[] = [
  // Kahvaltı
  { id: "yumurta", name: "Haşlanmış yumurta", portion: "1 adet", kcal: 75, protein: 6.5, carbs: 0.5, fat: 5, tags: ["protein", "light"] },
  { id: "menemen", name: "Menemen (2 yumurta)", portion: "1 tava", kcal: 250, protein: 14, carbs: 8, fat: 18, tags: ["protein"] },
  { id: "menemen3", name: "Menemen (3 yumurta, bol yağ)", portion: "1 tava", kcal: 380, protein: 19, carbs: 9, fat: 29, tags: ["dense"] },
  { id: "beyazpeynir", name: "Beyaz peynir", portion: "2 dilim (50 g)", kcal: 130, protein: 8, carbs: 1, fat: 10, tags: ["dense"] },
  { id: "kasar", name: "Kaşar peyniri", portion: "2 dilim (40 g)", kcal: 150, protein: 10, carbs: 0.5, fat: 12, tags: ["dense"] },
  { id: "lor", name: "Lor peyniri", portion: "100 g", kcal: 95, protein: 12, carbs: 3, fat: 4, tags: ["protein", "light"] },
  { id: "zeytin", name: "Zeytin", portion: "8 adet", kcal: 70, protein: 0.5, carbs: 1, fat: 7, tags: [] },
  { id: "tamekmek", name: "Tam buğday ekmek", portion: "1 dilim", kcal: 75, protein: 3.5, carbs: 13, fat: 1, tags: ["light"] },
  { id: "beyazekmek", name: "Beyaz ekmek", portion: "1 dilim (yarım parmak)", kcal: 80, protein: 2.5, carbs: 15, fat: 1, tags: [] },
  { id: "simit", name: "Simit", portion: "1 adet", kcal: 300, protein: 9, carbs: 52, fat: 7, tags: ["dense"] },
  { id: "pogaca", name: "Poğaça", portion: "1 adet", kcal: 300, protein: 6, carbs: 32, fat: 16, tags: ["dense"] },
  { id: "borek", name: "Su böreği", portion: "1 dilim", kcal: 350, protein: 12, carbs: 30, fat: 20, tags: ["dense"] },
  { id: "tahinpekmez", name: "Tahin-pekmez", portion: "2+2 yemek kaşığı", kcal: 300, protein: 5.5, carbs: 32, fat: 17, tags: ["dense"] },
  { id: "bal", name: "Bal", portion: "1 yemek kaşığı", kcal: 64, protein: 0, carbs: 17, fat: 0, tags: [] },
  { id: "fistikezmesi", name: "Fıstık ezmesi", portion: "2 yemek kaşığı", kcal: 190, protein: 7, carbs: 6, fat: 16, tags: ["dense"] },
  { id: "yulaf", name: "Yulaf (sütlü)", portion: "1 kase (40 g yulaf + 200 ml süt)", kcal: 270, protein: 12, carbs: 36, fat: 9, tags: [] },
  { id: "sut", name: "Tam yağlı süt", portion: "1 bardak (250 ml)", kcal: 155, protein: 8, carbs: 12, fat: 8, tags: ["dense"] },
  { id: "yogurt", name: "Yoğurt (tam yağlı)", portion: "1 kase (200 g)", kcal: 125, protein: 7, carbs: 9, fat: 7, tags: [] },
  { id: "suzmeyogurt", name: "Süzme yoğurt", portion: "150 g", kcal: 140, protein: 14.5, carbs: 6, fat: 6, tags: ["protein", "light"] },
  { id: "ayran", name: "Ayran", portion: "1 bardak (200 ml)", kcal: 70, protein: 3.5, carbs: 5, fat: 3.5, tags: ["light"] },
  { id: "kefir", name: "Kefir", portion: "1 bardak (250 ml)", kcal: 130, protein: 8, carbs: 11, fat: 6, tags: [] },
  // Çorba
  { id: "mercimek", name: "Mercimek çorbası", portion: "1 kase (250 ml)", kcal: 170, protein: 8.5, carbs: 24, fat: 5, tags: ["light"] },
  { id: "ezogelin", name: "Ezogelin çorbası", portion: "1 kase", kcal: 180, protein: 8, carbs: 26, fat: 5, tags: ["light"] },
  { id: "tavukcorba", name: "Tavuk suyu çorba", portion: "1 kase", kcal: 140, protein: 9, carbs: 14, fat: 5, tags: ["light"] },
  // Ana yemek
  { id: "tavukizgara", name: "Izgara tavuk göğüs", portion: "150 g", kcal: 240, protein: 45, carbs: 0, fat: 5, tags: ["protein", "light"] },
  { id: "tavukbut", name: "Tavuk but (fırın)", portion: "1 adet", kcal: 280, protein: 30, carbs: 0, fat: 17, tags: ["protein"] },
  { id: "kofte", name: "Izgara köfte", portion: "4 adet (120 g)", kcal: 280, protein: 22, carbs: 5, fat: 19, tags: ["protein"] },
  { id: "balik", name: "Levrek / çipura ızgara", portion: "1 balık", kcal: 275, protein: 37, carbs: 0, fat: 13, tags: ["protein", "light"] },
  { id: "ton", name: "Ton balığı (süzülmüş)", portion: "1 kutu (120 g)", kcal: 150, protein: 30, carbs: 0, fat: 3, tags: ["protein", "light"] },
  { id: "kurufasulye", name: "Kuru fasulye", portion: "1 porsiyon (250 g)", kcal: 300, protein: 14, carbs: 38, fat: 10, tags: [] },
  { id: "nohut", name: "Etli nohut", portion: "1 porsiyon", kcal: 320, protein: 16, carbs: 36, fat: 12, tags: [] },
  { id: "pilav", name: "Pirinç pilavı", portion: "1 porsiyon (180 g)", kcal: 290, protein: 5, carbs: 52, fat: 7, tags: ["dense"] },
  { id: "bulgur", name: "Bulgur pilavı", portion: "1 porsiyon (150 g)", kcal: 170, protein: 5, carbs: 32, fat: 3, tags: ["light"] },
  { id: "makarna", name: "Makarna (soslu)", portion: "1 tabak", kcal: 450, protein: 14, carbs: 75, fat: 10, tags: ["dense"] },
  { id: "mantı", name: "Mantı", portion: "1 porsiyon", kcal: 600, protein: 24, carbs: 70, fat: 24, tags: ["dense"] },
  { id: "zeytinyagli", name: "Zeytinyağlı sebze (fasulye/pırasa)", portion: "1 porsiyon (200 g)", kcal: 175, protein: 3.5, carbs: 16, fat: 11, tags: ["light"] },
  { id: "kizartma", name: "Kızartma (patlıcan/patates)", portion: "1 porsiyon", kcal: 400, protein: 4, carbs: 35, fat: 27, tags: ["dense"] },
  { id: "karniyarik", name: "Karnıyarık", portion: "1 adet", kcal: 350, protein: 12, carbs: 15, fat: 27, tags: [] },
  { id: "dolma", name: "Zeytinyağlı yaprak sarma", portion: "6 adet", kcal: 220, protein: 4, carbs: 30, fat: 10, tags: [] },
  { id: "salata", name: "Çoban salata (1 tk yağ)", portion: "1 kase", kcal: 90, protein: 2, carbs: 8, fat: 5, tags: ["light"] },
  // Sokak / dışarıda
  { id: "donerdurum", name: "Tavuk döner dürüm", portion: "1 adet", kcal: 620, protein: 30, carbs: 65, fat: 25, tags: ["dense"] },
  { id: "donerporsiyon", name: "Tavuk döner porsiyon (yarım lavaş)", portion: "1 porsiyon", kcal: 450, protein: 35, carbs: 30, fat: 20, tags: ["protein"] },
  { id: "etdurum", name: "Et döner dürüm", portion: "1 adet", kcal: 700, protein: 32, carbs: 60, fat: 36, tags: ["dense"] },
  { id: "lahmacun", name: "Lahmacun", portion: "1 adet", kcal: 290, protein: 13, carbs: 38, fat: 9, tags: [] },
  { id: "pide", name: "Kıymalı pide", portion: "1 adet", kcal: 750, protein: 32, carbs: 90, fat: 28, tags: ["dense"] },
  { id: "kumpir", name: "Kumpir", portion: "1 adet", kcal: 900, protein: 22, carbs: 90, fat: 50, tags: ["dense"] },
  { id: "tost", name: "Kaşarlı tost", portion: "1 adet", kcal: 380, protein: 17, carbs: 40, fat: 16, tags: [] },
  { id: "hamburger", name: "Hamburger", portion: "1 adet", kcal: 550, protein: 28, carbs: 45, fat: 28, tags: ["dense"] },
  { id: "pizza", name: "Pizza", portion: "2 dilim", kcal: 560, protein: 24, carbs: 64, fat: 22, tags: ["dense"] },
  { id: "midye", name: "Midye dolma", portion: "10 adet", kcal: 450, protein: 18, carbs: 60, fat: 15, tags: [] },
  { id: "islakhamburger", name: "Islak hamburger", portion: "1 adet", kcal: 300, protein: 12, carbs: 32, fat: 14, tags: [] },
  // Atıştırmalık / tatlı
  { id: "kuruyemis", name: "Karışık kuruyemiş", portion: "1 avuç (30 g)", kcal: 180, protein: 5.5, carbs: 6, fat: 16, tags: ["dense"] },
  { id: "badem", name: "Çiğ badem", portion: "15 adet", kcal: 105, protein: 4, carbs: 4, fat: 9, tags: [] },
  { id: "hurma", name: "Hurma", portion: "3 adet", kcal: 200, protein: 1.5, carbs: 54, fat: 0, tags: ["dense"] },
  { id: "muz", name: "Muz", portion: "1 orta", kcal: 105, protein: 1.3, carbs: 27, fat: 0.4, tags: [] },
  { id: "elma", name: "Elma", portion: "1 orta", kcal: 95, protein: 0.5, carbs: 25, fat: 0.3, tags: ["light"] },
  { id: "mandalina", name: "Mandalina", portion: "2 adet", kcal: 90, protein: 1.3, carbs: 22, fat: 0.5, tags: ["light"] },
  { id: "baklava", name: "Baklava", portion: "2 dilim", kcal: 290, protein: 4, carbs: 32, fat: 17, tags: ["dense"] },
  { id: "sutlac", name: "Fırın sütlaç", portion: "1 kase", kcal: 230, protein: 6, carbs: 38, fat: 6, tags: [] },
  { id: "cikolata", name: "Çikolata", portion: "1/3 tablet (25 g)", kcal: 135, protein: 2, carbs: 14, fat: 8, tags: [] },
  { id: "cips", name: "Cips", portion: "1 küçük paket (40 g)", kcal: 215, protein: 2.5, carbs: 21, fat: 14, tags: [] },
  // İçecek
  { id: "seker", name: "Şekerli çay", portion: "1 bardak (1 şeker)", kcal: 20, protein: 0, carbs: 5, fat: 0, tags: [] },
  { id: "kola", name: "Kola", portion: "1 kutu (330 ml)", kcal: 140, protein: 0, carbs: 35, fat: 0, tags: [] },
  { id: "latte", name: "Latte", portion: "orta boy", kcal: 190, protein: 10, carbs: 18, fat: 7, tags: [] },
  { id: "portakalsuyu", name: "Portakal suyu", portion: "1 bardak", kcal: 110, protein: 1.5, carbs: 26, fat: 0.5, tags: [] },
  // Kilo alma
  { id: "shake", name: "Kilo shake'i (süt+muz+yulaf+fıstık ezmesi+bal)", portion: "1 büyük bardak", kcal: 760, protein: 27, carbs: 95, fat: 30, tags: ["dense"] },
  { id: "proteinshake", name: "Protein tozu (sütle)", portion: "1 ölçek + 250 ml süt", kcal: 280, protein: 32, carbs: 15, fat: 9, tags: ["protein"] },
];

export const QUICK_SIZES = [
  { id: "s", label: "Küçük öğün", hint: "atıştırmalık, tek tabak hafif", kcal: 350, protein: 12, carbs: 40, fat: 15 },
  { id: "m", label: "Orta öğün", hint: "normal bir tabak", kcal: 650, protein: 25, carbs: 70, fat: 28 },
  { id: "l", label: "Büyük öğün", hint: "dışarıda doyurucu yemek", kcal: 1000, protein: 35, carbs: 100, fat: 48 },
];

export function searchFoods(q: string): Food[] {
  const n = norm(q);
  if (!n) return FOODS;
  return FOODS.filter((f) => norm(f.name).includes(n) || norm(f.id).includes(n));
}

function norm(s: string) {
  return s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}
