# Araştırma Özeti ve Tasarım Kararları

Bu dosya dört araştırma ajanının raporlarından çıkan kuralları ve uygulamada nasıl kullanıldıklarını toplar. Kodda `src/lib/engine.ts`, `src/lib/programs.ts` ve `src/lib/coach.ts` bu kurallara dayanır.

## 1. Enerji hesabı (ikisi için ortak)

- **BMR:** Mifflin-St Jeor. Erkek: 10·kg + 6.25·cm − 5·yaş + 5. Kadın: aynı formül, sonda −161. Yaygın denklemler içinde en tutarlısı (Frankenfield 2005).
- **Başlangıç TDEE:** BMR × aktivite katsayısı (hareketsiz 1.2, hafif 1.375).
- **Adaptif TDEE (MacroFactor mantığı):** son 14–28 günün ortalama alımı − (trend kilo değişimi × 7000 kcal/kg) / gün. İlk 3 hafta formül tahminiyle karıştırılır, kayıt doluluğu %70'in altındaysa güncelleme yapılmaz, haftalık değişim ±100 kcal ile sınırlı. 7700 kcal/kg kuralı kaybı abartır (Hall 2011), bu yüzden 7000 kullanılıyor.
- **Trend kilo:** üssel hareketli ortalama, α = 0.1. Ekranda ana sayı trenddir; günlük tartı soluk nokta olarak gösterilir.

## 2. Tolga: kilo alma

**Başlangıç:** BMR ≈ 1530 kcal, TDEE ≈ 2100–2370 kcal. Fazla +300–400 kcal → başlangıç hedefi ≈ 2600–2750 kcal, sonra adaptif döngü düzeltir (Slater 2019: daha büyük fazla çoğunlukla yağ ekler).
**Hedef hız:** vücut ağırlığının haftada %0.5'i ≈ 0.25–0.3 kg (Iraki 2019). İlk 2–3 haftadaki hızlı artış su ve glikojendir.
**Kilometre taşları:** 56 kg (BMI 18.5, ~1 ay), 60.5 kg (BMI 20, ~5 ay), ilk yıl için gerçekçi hedef 63–65 kg.
**Makro:** protein 1.6–2.2 g/kg (Morton 2018), öğün başına ~25 g; yağ ~1 g/kg; karbonhidrat kalan (~5–6 g/kg).
**Düzensiz yeme için:** "minimum gün" = 600+ kcal ve 25+ g proteinli 3 çapa öğün + 1 shake. 4–5 saat kayıt yoksa 300–500 kcal'lik pratik öneri. Gün sonunda açık kapatıcı ("600 kcal eksik: shake + bir avuç kuruyemiş"). Enerji yoğun yiyecekler (tahin-pekmez, kuruyemiş, tam yağlı süt) ve sıvı kalori.
**Kayıt doğruluğu:** insanlar yediklerini %8–40 eksik bildiriyor (Burrows 2019); yapay zeka fotoğraf tahmini büyük porsiyonları sistematik olarak düşük buluyor (Fridolfsson 2025). Adaptif TDEE bu sabit hatayı zamanla emer, bu yüzden tutarlılık her öğünün mükemmel ölçülmesinden önemli.
**Arayüz:** kilo alan için "hedefin altında" uyarı durumudur, fazla yapmak yeşildir.
**Antrenman (ev, vücut ağırlığı öncelikli, mat + birkaç ağırlık):**
- Kas başına haftada 8–10 sert setle başla, 9–12. haftalarda 12–16'ya çık (Schoenfeld 2017, Pelland 2026: artan hacimle getiri azalarak sürüyor).
- Her kası haftada 2 kez çalıştır; hacim eşitse frekansın etkisi küçük, yani frekans bir planlama aracı.
- Tekrar aralığı geniş tutulabilir: başarısızlığa yakın gidildiği sürece hafif ve ağır yükler benzer büyüme sağlar. Vücut ağırlığında set başına ~25–30 tekrarı geçince daha zor varyasyona geçilir.
- RIR: ilk 3 hafta 3–4 (teknik öğrenme), sonra 1–2. Tam başarısızlık gerekmiyor (Refalo 2023).
- İlerleme: önce tekrar, sonra tempo/duraklama, sonra zor varyasyon, sonra sırt çantasıyla yük. Tekrar artışı da yük artışı kadar işe yarar (Plotkin 2022). Şınav, düşük yüklü bench press ile benzer hipertrofi verdi (Kikuchi & Nakazato 2017).
- Kardiyo hipertrofiyi engellemiyor (Schumann 2022) ama kalori yakıyor; her koşu için tabağa ek kalori.
- Plato kuralı: ana hareket 3 seansta ilerlemiyorsa önce kilo trendine bak, haftada 0.1 kg'dan az artıyorsa günlük +150–200 kcal.

## 3. Eylül: sağlıklı yağ kaybı

**Gerçekçi tablo:** 158 cm / 55 kg, BMI ≈ 22. 47–48 kg hedefi BMI ≈ 19 demek; sağlıklı aralıkta ama alt kısımda. Kas kazanırken yağ kaybedeceği için tartı 4–6 kg gösterirken görünüm belirgin değişebilir. Bu yüzden bel ölçüsü, fotoğraf ve güç en az kilo kadar önemli gösteriliyor.
**Hız:** varsayılan haftada %0.4–0.5 (≈0.25 kg), üst sınır %0.7. 7–8 kg için ara bakım dönemleriyle 8–10 ay. İlk ara hedef −4 kg, ardından 4 hafta bakım ve yeniden değerlendirme.
**Açık:** günde ~250–350 kcal; bunun yarısı yemekten, yarısı yürüyüşten.
**Makro:** protein 1.8 g/kg (~99 g), yağ en az kalorinin %25'i ve 0.8 g/kg, lif 25–30 g.
**Diyet arası:** 6–8 haftalık açıktan sonra 1–2 hafta bakım (MATADOR, ICECAP).
**Hareket:** ilk haftanın adım ortalamasından başla, her hafta +500 adım, 8–9 bine kadar. Haftada 2→3 kuvvet seansı (kas korumak için). Sahilde yürüyüşten yürü-koş aralıklarına geçiş.
**Egzersiz kalorisi geri yenmez:** bileklik ve uygulamalar yakılan kaloriyi ciddi şekilde abartıyor (Shcherbina 2017).

### Güvenlik kuralları (kodda zorunlu)
1. Kalori tabanı: max(1300, BMR). Bot dahil hiçbir şey bunun altına inemez.
2. Hedef kilo BMI 18.5'in (46.2 kg) altına girilemez; BMI 19.5'in altı için doktor/diyetisyen önerisi gösterilir.
3. 3 haftalık trendde haftada %0.7'den hızlı kayıpta kalori otomatik 100–150 artar.
4. 8 hafta kesintisiz açıktan sonra bakım dönemi zorunlu.
5. Uyarı işaretleri (adet düzensizliği, baş dönmesi, sürekli üşüme, saç dökülmesi, yemekle aşırı meşguliyet, telafi davranışları, haftada 2+ gün 1000 kcal altı kayıt) açığı durdurur, bakıma alır ve profesyonel destek önerir.
6. Oruç günü, "yemeğini hak et" dili, kırmızı "aştın" uyarısı yok.

## 4. Davranış ve motivasyon

- Alışkanlık oturması ortalama ~66 gün sürüyor, tek bir kaçırılan gün süreci bozmuyor (Lally 2010). Uygulama bunu açıkça söylüyor.
- Eğer-ise planları ("Eve geç gelirsem yoğurt + meyve yerim") orta-büyük etki gösteriyor (Gollwitzer & Sheeran 2006).
- Seri kırılması motivasyonu düşürüyor (Silverman & Barasch 2023). Bu yüzden ana birim haftalık seri, ayda 1–2 dondurma hakkı ve ertesi gün "mini antrenman"la onarım var.
- Oyunlaştırma başlatıcı, motor değil (Mazeas 2022). Puanlar davranışa verilir, kiloya değil.
- Esnek kısıtlama katı kısıtlamadan daha sağlıklı sonuçlarla ilişkili. Günlük geçti/kaldı yerine haftalık bütçe ve ±150 kcal esneklik.

## 5. Çift katmanı

- Çift odaklı programlar bireysel olanlara göre ortalama daha fazla kilo değişimi sağladı ama kanıt orta-zayıf (Arvanitidou 2025).
- Destek türü önemli: sormak, empati, kontrol etmemek iyi; dırdır ve yemek yorumu ters tepiyor.
- **Kurallar:** kilolar ve kaloriler birbirinize karşılaştırılmaz. Ortak para birimi çaba: haftalık planın yüzde kaçı yapıldı. İkinizin ortalaması "Biz Göstergesi"ni doldurur, hedefe ulaşınca ortak ödül açılır. Eşe sadece beşlik, hazır tezahürat ve "yürüyüşe gel" daveti gönderilebilir. "Hatırlat" butonu yok.

## 6. Diyet botu

- Sohbet botlarının etkileşimi artırdığına dair umut verici ama düşük kaliteli kanıt var (Noh 2023, Aggarwal 2023).
- Ton: motivasyonel görüşme. Açık sorular, çabayı takdir, seçenek sunma, tavsiye öncesi izin, kısa mesaj ve tek somut sonraki adım.
- Bot planı araçlarla günceller (yemek kaydı, hedef değişikliği, yapılacaklar). Her hedef değişikliği yukarıdaki güvenlik kurallarından geçer.

## 7. Mevcut uygulamaların eksikleri ve bizim çözümümüz

| Eksik | Kimde | Bizde |
|---|---|---|
| Kilo almak isteyenler için tasarlanmamış | MyFitnessPal, Yazio, Noom | Tolga tarafı tamamen alma odaklı, plato olunca kalori artırır |
| Suçlayıcı kırmızı uyarılar | MyFitnessPal, Noom | Nötr renkler, haftalık bütçe |
| Türk ev yemekleri zayıf | MacroFactor, Yazio | Kepçe/kase/dilim porsiyonlu Türk yemek listesi |
| Antrenman ile kilo trendi ayrı | Hevy, Strong, Fitbod | Aynı ekranda güç ve kilo trendi |
| Düzensiz programa uymuyor | Boostcamp, sabit şablonlar | Haftalık set bütçesi, kaçırılan seans kaydırma, 5 dk mini antrenman |
| Çiftler için sağlık katmanı yok | Between, Paired | Biz Göstergesi, beşlik, ortak yürüyüş |

## Kaynaklar

Mifflin/Frankenfield 2005 · Hall 2011 (Lancet) · Iraki 2019 (Sports) · Morton 2018 (BJSM) · Schoenfeld 2016, 2017 · Pelland 2026 (Sports Med) · Refalo 2023 · Plotkin 2022 (PeerJ) · Kikuchi & Nakazato 2017 · Schumann 2022 · Helms 2014 · Aragon 2017 (ISSN) · Byrne 2018 MATADOR · Peos 2021 ICECAP · IOC REDs 2023 · Paluch 2022 (Lancet Public Health) · Shcherbina 2017 · Lally 2010 · Gollwitzer & Sheeran 2006 · Silverman & Barasch 2023 · Patel 2019 STEP UP · Mazeas 2022 (JMIR) · Arvanitidou 2025 · Noh 2023 (JMIR) · Westenhoefer 1999 · TÜRKOMP (besin değerleri için).

Not: Türk yemeklerinin kalori değerleri yaklaşık değerlerdir; mümkünse TÜRKOMP ile doğrulanmalıdır. Bu uygulama bir doktorun veya diyetisyenin yerini tutmaz.
