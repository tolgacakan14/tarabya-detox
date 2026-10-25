// Home, bodyweight-first programs (mat + a few dumbbells, seaside for walks/runs).
// Tolga: hypertrophy full body A/B 3x/week. Eylül: beginner strength 2->3x/week + step ramp.
import type { UserId } from "./store";

export interface Variation {
  name: string;
  how: string;
}

export interface ExerciseDef {
  id: string;
  muscle: string;
  repMin: number;
  repMax: number;
  perSide?: boolean;
  seconds?: boolean; // reps are seconds (holds)
  ladder: Variation[]; // easiest -> hardest
}

const L = (name: string, how: string): Variation => ({ name, how });

export const EXERCISES: Record<string, ExerciseDef> = {
  // ---- Tolga ----
  t_squat: {
    id: "t_squat", muscle: "Bacak (ön)", repMin: 10, repMax: 20,
    ladder: [
      L("Vücut ağırlığı squat", "Ayaklar omuz genişliğinde, kalça dizlerin altına inene kadar otur."),
      L("Tempolu squat (3 sn iniş)", "3 saniyede in, 1 saniye dipte bekle, hızlı kalk."),
      L("Goblet squat (dambıl)", "Dambılı göğsünde tut, dik gövdeyle derin otur."),
      L("Goblet squat, dipte 2 sn bekleme", "Dipte 2 saniye dur, gerilimi bırakma."),
      L("Bulgarian split squat (dambıl)", "Arka ayak sandalyede, ön dizin ayak ucunu çok geçmeden in."),
    ],
  },
  t_pushup: {
    id: "t_pushup", muscle: "Göğüs, arka kol", repMin: 8, repMax: 25,
    ladder: [
      L("Eğimli şınav (masa/koltuk)", "Eller yüksekte, vücut tek çizgi."),
      L("Klasik şınav", "Göğüs yere bir yumruk kalana kadar in."),
      L("Tempolu şınav (3 sn iniş)", "Yavaş in, patlayıcı kalk."),
      L("Ayak yükseltilmiş şınav", "Ayaklar sandalyede, üst göğüs daha çok çalışır."),
      L("Derin şınav (eller kitaplarda)", "Eller yükseltide, göğüs ellerin altına iner."),
      L("Sırt çantalı şınav", "Çantaya kitap koy, yükü artır."),
    ],
  },
  t_row: {
    id: "t_row", muscle: "Sırt, ön kol", repMin: 8, repMax: 15,
    ladder: [
      L("Masa altında ters kürek (dizler bükük)", "Sağlam masanın kenarını tut, göğsünü masaya çek."),
      L("Ters kürek (bacaklar düz)", "Vücut düz, topuklar yerde."),
      L("Tek kol dambıl row", "Bir el ve diz sandalyede, dambılı kalçana doğru çek."),
      L("Tek kol row, tepede 2 sn sıkma", "Tepede kürek kemiğini sık ve bekle."),
      L("Ters kürek, ayaklar yüksekte", "Ayaklar sandalyede, en zor varyasyon."),
    ],
  },
  t_split: {
    id: "t_split", muscle: "Bacak, kalça", repMin: 8, repMax: 15, perSide: true,
    ladder: [
      L("Geri lunge", "Bir adım geri at, arka diz yere yaklaşsın."),
      L("Bulgarian split squat", "Arka ayak sandalyede."),
      L("Dambıllı Bulgarian split squat", "Her elde dambıl."),
      L("Deficit Bulgarian (ön ayak kitapta)", "Daha derin hareket açıklığı."),
    ],
  },
  t_lateral: {
    id: "t_lateral", muscle: "Omuz (yan)", repMin: 12, repMax: 25,
    ladder: [
      L("Dambıl yana açış", "Dirsek hafif bükük, omuz hizasına kadar kaldır."),
      L("Dambıl yana açış, 3 sn iniş", "Yavaş indir."),
      L("Tek kol yana açış, eğik durarak", "Kapı kasasına tutun, gövdeyi hafif yatır."),
    ],
  },
  t_curl: {
    id: "t_curl", muscle: "Ön kol (biceps)", repMin: 10, repMax: 20,
    ladder: [
      L("Dambıl curl", "Dirsekler sabit, sallanmadan kaldır."),
      L("Hammer curl + curl dönüşümlü", "Tutuşu değiştir."),
      L("Yavaş eksantrik curl (4 sn iniş)", "İnişi çok yavaş yap."),
    ],
  },
  t_hinge: {
    id: "t_hinge", muscle: "Arka bacak, kalça", repMin: 10, repMax: 20,
    ladder: [
      L("Glute bridge", "Sırt üstü, kalçayı sık ve yukarı it."),
      L("Tek bacak glute bridge", "Bir bacak havada."),
      L("Dambıl Romanian deadlift", "Dizler hafif bükük, kalçayı geri it, sırt düz."),
      L("Tek bacak Romanian deadlift", "Dengeyi kur, kalçadan menteşelen."),
    ],
  },
  t_pike: {
    id: "t_pike", muscle: "Omuz (ön), arka kol", repMin: 6, repMax: 15,
    ladder: [
      L("Pike şınav", "Kalça yukarıda ters V, başı ellerin önüne indir."),
      L("Ayak yükseltilmiş pike şınav", "Ayaklar sandalyede."),
      L("Dambıl omuz press (oturarak)", "Dik otur, kulak hizasından yukarı it."),
      L("Duvara dayalı amuda kalkış tutuşu", "30 saniyeye kadar tut, sonra mini iniş dene."),
    ],
  },
  t_dip: {
    id: "t_dip", muscle: "Arka kol, göğüs", repMin: 8, repMax: 20,
    ladder: [
      L("Sandalye dips (dizler bükük)", "Eller sandalye kenarında."),
      L("Sandalye dips (bacaklar düz)", "Topuklar yerde."),
      L("Dar şınav", "Eller göğüs hizasında, dirsekler gövdeye yakın."),
      L("Dambıl floor press", "Yerde sırt üstü, dirsekler yere değene kadar indir."),
    ],
  },
  t_core: {
    id: "t_core", muscle: "Karın", repMin: 20, repMax: 60, seconds: true,
    ladder: [
      L("Plank", "Dirsekler omuz altında, karın sıkı."),
      L("Hollow hold", "Sırt yerde, kollar ve bacaklar havada, bel yere bastırılı."),
      L("Plank, omuz dokunuşlu", "Kalça sallanmadan."),
    ],
  },
  // ---- Eylül ----
  e_squat: {
    id: "e_squat", muscle: "Bacak, kalça", repMin: 10, repMax: 15,
    ladder: [
      L("Sandalyeye otur-kalk", "Kollar önde, sandalyeye dokun ve kalk."),
      L("Vücut ağırlığı squat", "Kalça dizlerin seviyesine insin."),
      L("Sırt çantalı/dambıllı squat", "Ağırlığı göğsünde tut."),
      L("Tempolu dambıllı squat", "3 saniyede in."),
      L("Split squat", "Bir ayak önde, bir ayak arkada, aşağı yukarı."),
    ],
  },
  e_bridge: {
    id: "e_bridge", muscle: "Kalça", repMin: 12, repMax: 20,
    ladder: [
      L("Glute bridge", "Kalçayı sık, 1 saniye tepede bekle."),
      L("Glute bridge, tepede 3 sn", "Tepede bekle."),
      L("Dambıllı glute bridge", "Dambıl kalça kemiğinin üstünde."),
      L("Tek bacak glute bridge", "Bir bacak havada."),
    ],
  },
  e_push: {
    id: "e_push", muscle: "Göğüs, kol", repMin: 8, repMax: 15,
    ladder: [
      L("Duvar şınavı", "Ellerini duvara yasla, göğsünü duvara yaklaştır."),
      L("Tezgah şınavı", "Mutfak tezgahı ya da masa."),
      L("Alçak eğimli şınav (koltuk/basamak)", "Daha alçak yüzey."),
      L("Dizden şınav", "Dizler yerde, vücut düz."),
      L("Klasik şınav", "Tam şınav."),
    ],
  },
  e_row: {
    id: "e_row", muscle: "Sırt", repMin: 10, repMax: 15,
    ladder: [
      L("Havlu row (kapı kolu)", "Havluyu kapıya sabitle, geri yaslan ve çek."),
      L("Sırt çantalı eğik row", "Öne eğil, çantayı göbeğine çek."),
      L("Tek kol dambıl row", "Diz ve el sandalyede."),
      L("Tek kol row, tepede 2 sn", "Kürek kemiğini sık."),
    ],
  },
  e_deadbug: {
    id: "e_deadbug", muscle: "Karın", repMin: 6, repMax: 12, perSide: true,
    ladder: [
      L("Dead bug", "Bel yerde kalsın, karşı kol ve bacağı uzat."),
      L("Dead bug, yavaş (3 sn)", "Her uzatmayı yavaşlat."),
      L("Dambıllı dead bug", "Ellerde hafif ağırlık."),
    ],
  },
  e_lunge: {
    id: "e_lunge", muscle: "Bacak, kalça", repMin: 8, repMax: 12, perSide: true,
    ladder: [
      L("Destekli geri lunge", "Sandalyeye tutunarak."),
      L("Geri lunge", "Desteksiz."),
      L("Dambıllı geri lunge", "Ellerde dambıl."),
      L("Bulgarian split squat", "Arka ayak sandalyede."),
    ],
  },
  e_hinge: {
    id: "e_hinge", muscle: "Arka bacak, kalça", repMin: 10, repMax: 15,
    ladder: [
      L("Kalça menteşesi (good morning)", "Eller göğüste, kalçayı geri it."),
      L("Sırt çantalı/dambıllı Romanian deadlift", "Sırt düz, dizler hafif bükük."),
      L("Tempolu Romanian deadlift", "3 sn iniş."),
      L("Tek bacak Romanian deadlift (destekli)", "Duvara dokunarak denge."),
    ],
  },
  e_pike: {
    id: "e_pike", muscle: "Omuz", repMin: 8, repMax: 15,
    ladder: [
      L("Dambıl omuz press (oturarak)", "Hafif ağırlıkla yukarı it."),
      L("Duvara pike şınav", "Eller duvara yakın yerde, kalça yukarıda."),
      L("Pike şınav", "Ters V pozisyonunda."),
    ],
  },
  e_sideplank: {
    id: "e_sideplank", muscle: "Karın (yan)", repMin: 15, repMax: 40, perSide: true, seconds: true,
    ladder: [
      L("Dizden yan plank", "Dizler yerde."),
      L("Yan plank", "Ayaklar üst üste."),
      L("Yan plank, kalça indir-kaldır", "Kontrollü hareket."),
    ],
  },
};

export interface SessionDef {
  key: string;
  title: string;
  exercises: string[];
}

export const SESSIONS: Record<UserId, SessionDef[]> = {
  tolga: [
    { key: "A", title: "Tüm vücut A", exercises: ["t_squat", "t_pushup", "t_row", "t_split", "t_lateral", "t_curl"] },
    { key: "B", title: "Tüm vücut B", exercises: ["t_hinge", "t_pike", "t_row", "t_split", "t_dip", "t_core"] },
  ],
  eylul: [
    { key: "A", title: "Güç A", exercises: ["e_squat", "e_bridge", "e_push", "e_row", "e_deadbug"] },
    { key: "B", title: "Güç B", exercises: ["e_lunge", "e_hinge", "e_pike", "e_row", "e_sideplank"] },
  ],
};

export function phaseFor(user: UserId, week: number) {
  if (user === "tolga") {
    if (week <= 3) return { sets: 2, rir: "3-4", note: "Hareketleri öğrenme haftaları. Her sette 3-4 tekrar daha yapabilecek gibi bitir." };
    if (week <= 8) return { sets: 3, rir: "1-2", note: "Artık ciddiyiz. Her sette 1-2 tekrar kalana kadar git." };
    return { sets: 4, rir: "1-2", note: "Hacim artıyor. Ana hareketler 4 set, son set neredeyse tükenene kadar." };
  }
  if (week <= 2) return { sets: 2, rir: "3", note: "Sıfırdan başlıyoruz. Rahat bitir, alışkanlık önemli." };
  if (week <= 6) return { sets: 2, rir: "2-3", note: "Biraz daha zorla, ama formu bozma." };
  return { sets: 3, rir: "1-2", note: "Güçlendin. Son tekrarlar zor gelmeli." };
}

export const MINI: Record<UserId, { title: string; steps: string[] }> = {
  tolga: {
    title: "5 dakikalık mini antrenman",
    steps: ["15 squat", "Mümkün olan en çok şınav", "10 glute bridge", "30 sn plank", "Bir tur daha"],
  },
  eylul: {
    title: "5 dakikalık mini antrenman",
    steps: ["10 squat", "10 glute bridge", "5 duvar/tezgah şınavı", "20 sn plank", "Bir tur daha"],
  },
};

/** Seaside cardio. Eylül progresses walk -> walk/run. Tolga easy runs (needs extra food). */
export function cardioFor(user: UserId, week: number): { title: string; detail: string; minutes: number } {
  if (user === "tolga") {
    return {
      title: "Sahilde hafif koşu veya tempolu yürüyüş",
      detail: "20-30 dk, konuşabileceğin tempoda. Haftada en fazla 2 kez, antrenmandan en az 3 saat ayrı. Koştuğun gün bir shake ya da bir avuç kuruyemiş ekle.",
      minutes: 25,
    };
  }
  if (week <= 4) return { title: "Sahil yürüyüşü", detail: `${15 + week * 5} dk tempolu yürüyüş. Konuşabiliyor ama şarkı söyleyemiyor olmalısın.`, minutes: 15 + week * 5 };
  const runMin = Math.min(5, 1 + Math.floor((week - 5) / 2));
  const walkMin = Math.max(1, 3 - Math.floor((week - 5) / 3));
  const rounds = Math.min(8, 5 + Math.floor((week - 5) / 2));
  return {
    title: "Sahilde yürü-koş",
    detail: `5 dk ısınma yürüyüşü, sonra ${rounds} tur: ${runMin} dk hafif koşu + ${walkMin} dk yürüyüş. Nefesin kesilirse yürüyüşü uzat, sorun değil.`,
    minutes: 10 + rounds * (runMin + walkMin),
  };
}
