import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  Animated, 
  Dimensions, 
  StatusBar, 
  TouchableOpacity, 
  Modal, 
  Switch, 
  ScrollView, 
  TextInput, 
  PanResponder,
  Linking,
  Share,
  Alert,
  Image,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  LogBox
} from 'react-native';

// SENSÖR MOTORU (CANLI KIBLE İÇİN)
import CompassHeading from 'react-native-compass-heading';

// HAFIZA MOTORU (BÜTÇE VE DEFTER İÇİN KALICI KAYIT)
import AsyncStorage from '@react-native-async-storage/async-storage';

// ARKA PLAN BİLDİRİM VE ALARM MOTORU
import notifee, { TriggerType, AndroidImportance, TimestampTrigger, AndroidCategory, AndroidVisibility } from '@notifee/react-native';

// SES MOTORU (Ezan ve Kuran Dinletisi İçin)
// @ts-ignore
import Sound from 'react-native-sound';

Sound.setCategory('Playback');

// Bütün sarı uyarı ekranlarını gizler ve uygulamanın donmasını engeller
LogBox.ignoreAllLogs();

const { width, height } = Dimensions.get('window');
const MODAL_WIDTH = width * 0.95;
const PAGE_WIDTH = MODAL_WIDTH - 30; // Paddingleri çıkardık, tam sayfa genişliği

// --- PUSULA İÇİN SONSUZ DÖNÜŞ MATEMATİĞİ ---
const compassInputRange: number[] = [];
const compassOutputRange: string[] = [];
for (let i = -50; i <= 50; i++) {
  compassInputRange.push(i * 360);
  compassOutputRange.push(`${-i * 360}deg`); // Cihaz sağa dönerken pusula sola döner
}

// --- 8 DİLLİ SÖZLÜK ---
const translations = {
  tr: { 
    welcome: 'Hoş Geldiniz', settings: 'Ayarlar', autoLocation: 'Otomatik Konum', 
    currentLocation: 'Şu anki konumunuz', city: 'İstanbul, Türkiye', notifications: 'Bildirimler', 
    language: 'Dil Seçimi', close: 'Kapat', localeCode: 'tr-TR', languageName: 'Türkçe', 
    imsak: 'İmsak', sun: 'Güneş', dhuhr: 'Öğle', asr: 'İkindi', maghrib: 'Akşam', isha: 'Yatsı', 
    timeLeft: 'Kalan Süre', biorhythm: 'Biyoritim', physical: 'Fiziksel', emotional: 'Duygusal', 
    intellectual: 'Zihinsel', esma: 'Yaşayan Esma', infoTitle: 'Bilgi', 
    bioInfo: 'Biyoritim, insanın doğduğu andan itibaren enerjilerinin döngülerini gösterir.', 
    esmaInfo: 'Yaşayan Esma, her gün Allah\'ın 99 isminden birini hatırlatır.', 
    elifbaTitle: 'Elifba & Oyun', 
    elifbaInfo: 'Öğrenim sekmesinde kartlara dokunarak okunuşunu görebilirsiniz. Hafıza oyununu oynamak için ekranı sağa kaydırın!',
    prayerTimesTitle: 'VAKİTLER', adhanPlaying: 'Ezan okunuyor...', prayerTimeArrived: 'Vakti Geldi',
    zikirmatik: 'Zikirmatik', home: 'Ev', quran: 'Kur\'an', tapToCount: 'ZİKİR ÇEK', 
    selectDhikr: 'Zikir Seç / Ekle ▼', addCustom: 'Yeni Zikir Ekle', addBtn: '+ Ekle', reset: 'Sıfırla', 
    d1: 'Sübhanallah', d2: 'Elhamdülillah', d3: 'Allahuekber', d4: 'La ilahe illallah',
    qibla: 'Kıble Pusulası', north: 'K', east: 'D', south: 'G', west: 'B', qiblaAngle: 'Kıble Açısı',
    kibleBtn: 'KIBLE', budget: 'Bütçe', budgetTitle: 'Günlük Bütçem', budgetSubtitle: 'İsrafı Önle',
    budgetSetupTitle: 'Bütçe Ayarı', budgetSetupDesc: 'Maaşınızı ve sabit giderlerinizi girerek harcama limitinizi anında görün.',
    startBtn: 'Başla →', monthlyIncome: 'Aylık Maaş', fixedExp: 'Sabit Gider (Kira, Fatura vb.)', 
    saveBlessing: 'Kaydet', spentBtn: 'HARCADIM', amount: 'Tutar', changeSettings: 'Değiştir', 
    changeSettingsTitle: 'Ayarlar', sparkleText: '✨ Dünkü tasarrufunuz bugünün bereketi oldu!',
    fastExpense: 'Hızlı Harcama Ekle', openNotebook: '📖 Harcama Defterini Aç', notebookTitle: 'Bereket Defteri',
    notebookPlaceholder: 'Nereye, ne kadar harcadım? Buraya not edebilirsin...',
    budgetInfoText: 'Aylık gelirinizden sabit giderlerinizi çıkarır ve kalan tutarı ayın kalan gün sayısına böler. Amacı, paranızı israf etmeden ay sonuna kadar eşit kullanmanızı sağlamaktır.',
    resetSpend: 'Sıfırla', resetBudget: 'Sıfırla', tools: 'Rehber', toolsTitle: 'Rehber', toolsSubtitle: 'Faydalı İslami Rehberler',
    calibrate: 'Hassasiyet İçin Cihazınızı 8 Çizerek Hareket Ettirin'
  },
  en: { 
    welcome: 'Welcome', settings: 'Settings', autoLocation: 'Auto Location', 
    currentLocation: 'Your current location', city: 'Istanbul, Turkey', notifications: 'Notifications', 
    language: 'Language', close: 'Close', localeCode: 'en-US', languageName: 'English', 
    imsak: 'Fajr', sun: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', 
    timeLeft: 'Time Left', biorhythm: 'Biorhythm', physical: 'Physical', emotional: 'Emotional', 
    intellectual: 'Intellectual', esma: 'Living Asma', infoTitle: 'Information', 
    bioInfo: 'Biorhythm shows the cycles of a person\'s energies from birth.', 
    esmaInfo: 'Living Asma presents one of the 99 names of Allah every day.', 
    elifbaTitle: 'Elifba & Game', 
    elifbaInfo: 'Tap cards to learn. Swipe right to play the Memory Game!',
    prayerTimesTitle: 'PRAYER TIMES', adhanPlaying: 'Adhan is playing...', prayerTimeArrived: 'Time Arrived',
    zikirmatik: 'Dhikr', home: 'Home', quran: 'Quran', tapToCount: 'DHIKR', 
    selectDhikr: 'Select / Add Dhikr ▼', addCustom: 'Add Custom Dhikr', addBtn: '+ Add', reset: 'Reset', 
    d1: 'Subhanallah', d2: 'Alhamdulillah', d3: 'Allahu Akbar', d4: 'La ilaha illallah',
    qibla: 'Qibla Compass', north: 'N', east: 'E', south: 'S', west: 'W', qiblaAngle: 'Qibla Angle',
    kibleBtn: 'QIBLA', budget: 'Budget', budgetTitle: 'Daily Budget', budgetSubtitle: 'Prevent Waste',
    budgetSetupTitle: 'Budget Setup', budgetSetupDesc: 'Enter your income and fixed expenses to see your daily limit.',
    startBtn: 'Start →', monthlyIncome: 'Monthly Income', fixedExp: 'Fixed Expenses', 
    saveBlessing: 'Save', spentBtn: 'SPENT', amount: 'Amount', changeSettings: 'Change', 
    changeSettingsTitle: 'Settings', sparkleText: "✨ Yesterday's savings are today's blessings!",
    fastExpense: 'Quick Expense Add', openNotebook: '📖 Open Expense Notebook', notebookTitle: 'Blessing Notebook',
    notebookPlaceholder: 'What did you spend on? Note it here...',
    budgetInfoText: 'Calculates your daily limit by dividing your remaining money by the days left in the month. Designed to prevent waste.',
    resetSpend: 'Reset', resetBudget: 'Reset', tools: 'Guide', toolsTitle: 'Guide', toolsSubtitle: 'Useful Islamic Guides',
    calibrate: 'Move your device in a figure 8 to calibrate'
  },
  ar: { 
    welcome: 'أهلاً بك', settings: 'الإعدادات', autoLocation: 'الموقع التلقائي', 
    currentLocation: 'موقعك الحالي', city: 'إسطنبول، تركيا', notifications: 'إشعارات', 
    language: 'لغة', close: 'إغلاق', localeCode: 'ar-SA', languageName: 'العربية', 
    imsak: 'الفجر', sun: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء', 
    timeLeft: 'الوقت المتبقي', biorhythm: 'الإيقاع الحيوي', physical: 'جسدي', emotional: 'عاطفي', 
    intellectual: 'عقلي', esma: 'الأسماء الحسنى', infoTitle: 'معلومات', 
    bioInfo: 'الإيقاع الحيوي يوضح دورات طاقات الإنسان منذ الولادة.', 
    esmaInfo: 'الأسماء الحسنى تذكرك كل يوم باسم من أسماء الله.', 
    elifbaTitle: 'الأبجدية واللعبة', 
    elifbaInfo: 'اضغط على البطاقات للتعلم. اسحب لليمين للعب لعبة الذاكرة!',
    prayerTimesTitle: 'أوقات الصلاة', adhanPlaying: 'الأذان يرفع الآن...', prayerTimeArrived: 'حان الوقت',
    zikirmatik: 'المسبحة', home: 'الرئيسية', quran: 'القرآن', tapToCount: 'اضغط', 
    selectDhikr: 'اختر / أضف ذكر ▼', addCustom: 'إضافة ذكر جديد', addBtn: '+ إضافة', reset: 'إعادة ضبط', 
    d1: 'سبحان الله', d2: 'الحمد لله', d3: 'الله أكبر', d4: 'لا إله إلا الله',
    qibla: 'بوصلة القبلة', north: 'ش', east: 'ق', south: 'ج', west: 'غ', qiblaAngle: 'زاوية القبلة',
    kibleBtn: 'القبلة', budget: 'الميزانية', budgetTitle: 'ميزانيتي اليومية', budgetSubtitle: 'تجنب الإسراف',
    budgetSetupTitle: 'إعداد الميزانية', budgetSetupDesc: 'أدخل دخلك ونفقاتك الثابتة لمعرفة حدك اليومي.',
    startBtn: 'ابدأ ←', monthlyIncome: 'الدخل الشهري', fixedExp: 'نفقات ثابتة', 
    saveBlessing: 'حفظ', spentBtn: 'أنفقت', amount: 'المبلغ', changeSettings: 'تغيير', 
    changeSettingsTitle: 'إعدادات', sparkleText: '✨ مدخرات الأمس هي بركات اليوم!',
    fastExpense: 'إضافة نفقة سريعة', openNotebook: '📖 فتح دفتر النفقات', notebookTitle: 'دفتر البركة',
    notebookPlaceholder: 'على ماذا أنفقت؟ اكتب هنا...',
    budgetInfoText: 'يحسب حدك اليومي بقسمة أموالك المتبقية على الأيام المتبقية في الشهر. مصمم لمنع الإسراف.',
    resetSpend: 'إعادة تعيين', resetBudget: 'إعادة تعيين', tools: 'دليل', toolsTitle: 'دليل', toolsSubtitle: 'أدلة إسلامية مفيدة',
    calibrate: 'حرك جهازك في شكل 8 للمعايرة'
  },
  fa: { 
    welcome: 'خوش آمدید', settings: 'تنظیمات', autoLocation: 'مکان یابی خودکار', 
    currentLocation: 'مکان فعلی شما', city: 'استانبول، ترکیه', notifications: 'اطلاعیه', 
    language: 'زبان', close: 'بستن', localeCode: 'fa-IR', languageName: 'فارسی', 
    imsak: 'فجر', sun: 'طلوع', dhuhr: 'ظهر', asr: 'عصر', maghrib: 'مغرب', isha: 'عشا', 
    timeLeft: 'زمان باقیمانده', biorhythm: 'بیوریتم', physical: 'فیزیکی', emotional: 'عاطفی', 
    intellectual: 'فکری', esma: 'اسماء حسنی', infoTitle: 'اطلاعات', 
    bioInfo: 'بیوریتم چرخه انرژی های انسان را از زمان تولد نشان می دهد.', 
    esmaInfo: 'اسماء حسنی هر روز یکی از نام های خداوند را یادآوری می کند.', 
    elifbaTitle: 'الفبا و بازی', 
    elifbaInfo: 'برای یادگیری روی کارت ها ضربه بزنید. برای بازی به راست بکشید!',
    prayerTimesTitle: 'اوقات شرعی', adhanPlaying: 'اذان در حال پخش است...', prayerTimeArrived: 'وقت نماز',
    zikirmatik: 'ذکرشمار', home: 'خانه', quran: 'قرآن', tapToCount: 'ذکر', 
    selectDhikr: 'انتخاب / افزودن ذکر ▼', addCustom: 'افزودن ذکر جدید', addBtn: '+ افزودن', reset: 'بازنشانی', 
    d1: 'سبحان الله', d2: 'الحمد لله', d3: 'الله اکبر', d4: 'لا اله الا الله',
    qibla: 'قطب نمای قبله', north: 'ش', east: 'ق', south: 'ج', west: 'غ', qiblaAngle: 'زاویه قبله',
    kibleBtn: 'قبله', budget: 'بودجه', budgetTitle: 'بودجه روزانه', budgetSubtitle: 'جلوگیری از اسراف',
    budgetSetupTitle: 'تنظیم بودجه', budgetSetupDesc: 'درآمد و هزینه های ثابت خود را وارد کنید.',
    startBtn: 'شروع ←', monthlyIncome: 'درآمد ماهانه', fixedExp: 'هزینه های ثابت', 
    saveBlessing: 'صرفه جویی', spentBtn: 'خرج کردم', amount: 'مبلغ', changeSettings: 'تغییر دادن', 
    changeSettingsTitle: 'تنظیمات', sparkleText: '✨ پس انداز دیروز، برکت امروز است!',
    fastExpense: 'هزینه سریع', openNotebook: '📖 باز کردن دفترچه', notebookTitle: 'دفترچه برکت',
    notebookPlaceholder: 'چه چیزی خرج کردید؟ اینجا یادداشت کنید...',
    budgetInfoText: 'حد روزانه شما را با تقسیم پول باقیمانده بر روزهای باقیمانده ماه محاسبه می کند. برای جلوگیری از اسراف طراحی شده است.',
    resetSpend: 'بازنشانی', resetBudget: 'بازنشانی', tools: 'راهنما', toolsTitle: 'راهنما', toolsSubtitle: 'راهنماهای مفید اسلامی',
    calibrate: 'دستگاه خود را به شکل 8 حرکت دهید'
  },
  ru: { 
    welcome: 'Добро пожаловать', settings: 'Настройки', autoLocation: 'Автоматическое местоположение', 
    currentLocation: 'Ваше текущее местоположение', city: 'Стамбул, Турция', notifications: 'Уведомления', 
    language: 'Язык', close: 'Закрыть', localeCode: 'ru-RU', languageName: 'Русский', 
    imsak: 'Фаджр', sun: 'Восход', dhuhr: 'Зухр', asr: 'Аср', maghrib: 'Магриб', isha: 'Иша', 
    timeLeft: 'Осталось', biorhythm: 'Биоритм', physical: 'Физический', emotional: 'Эмоциональный', 
    intellectual: 'Интеллект', esma: 'Прекрасные имена', infoTitle: 'Информация', 
    bioInfo: 'Биоритм показывает циклы энергии человека с рождения.', 
    esmaInfo: 'Каждый день напоминает об одном из 99 имен Аллаха.', 
    elifbaTitle: 'Элифба и Игра', 
    elifbaInfo: 'Нажмите на карточки, чтобы учиться. Проведите вправо, чтобы сыграть!',
    prayerTimesTitle: 'ВРЕМЯ НАМАЗА', adhanPlaying: 'Звучит азан...', prayerTimeArrived: 'Время пришло',
    zikirmatik: 'Зикр', home: 'Главная', quran: 'Коран', tapToCount: 'ЗИКР', 
    selectDhikr: 'Выбрать / Добавить зикр ▼', addCustom: 'Добавить новый', addBtn: '+ Добавить', reset: 'Сброс', 
    d1: 'Субханаллах', d2: 'Альхамдулиллях', d3: 'Аллаху Акбар', d4: 'Ля иляха илляллах',
    qibla: 'Компас Кыблы', north: 'С', east: 'В', south: 'Ю', west: 'З', qiblaAngle: 'Угол Кыблы',
    kibleBtn: 'КЫБЛА', budget: 'Бюджет', budgetTitle: 'Дневной бюджет', budgetSubtitle: 'Без отходов',
    budgetSetupTitle: 'Настройка бюджета', budgetSetupDesc: 'Введите свои доходы и фиксированные расходы.',
    startBtn: 'Старт →', monthlyIncome: 'Доход', fixedExp: 'Расходы', 
    saveBlessing: 'Сохранить', spentBtn: 'ПОТРАЧЕНО', amount: 'Сумма', changeSettings: 'Изменить', 
    changeSettingsTitle: 'Настройки', sparkleText: '✨ Вчерашняя экономия — благословение!',
    fastExpense: 'Быстрый Расход', openNotebook: '📖 Открыть блокнот', notebookTitle: 'Блокнот',
    notebookPlaceholder: 'На что вы потратили?',
    budgetInfoText: 'Рассчитывает ваш ежедневный лимит.',
    resetSpend: 'Сброс', resetBudget: 'Сброс', tools: 'Руководство', toolsTitle: 'Руководство', toolsSubtitle: 'Полезные руководства',
    calibrate: 'Двигайте устройством в форме восьмерки'
  },
  fr: { 
    welcome: 'Bienvenue', settings: 'Paramètres', autoLocation: 'Emplacement auto', 
    currentLocation: 'Votre position', city: 'Istanbul, Turquie', notifications: 'Notifications', 
    language: 'Langue', close: 'Fermer', localeCode: 'fr-FR', languageName: 'Français', 
    imsak: 'Fajr', sun: 'Lever', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', 
    timeLeft: 'Temps restant', biorhythm: 'Biorythme', physical: 'Physique', emotional: 'Émotionnel', 
    intellectual: 'Intellectuel', esma: "Noms d'Allah", infoTitle: 'Information', 
    bioInfo: "Le biorythme montre les cycles d'énergie d'une personne depuis sa naissance.", 
    esmaInfo: "Rappelle l'un des 99 noms d'Allah chaque jour.", 
    elifbaTitle: 'Alphabet & Jeu', 
    elifbaInfo: 'Appuyez pour apprendre. Glissez à droite pour jouer!',
    prayerTimesTitle: 'HEURES DE PRIÈRE', adhanPlaying: 'Adhan en cours...', prayerTimeArrived: 'L\'heure est arrivée',
    zikirmatik: 'Dhikr', home: 'Accueil', quran: 'Coran', tapToCount: 'DHIKR', 
    selectDhikr: 'Sélectionner / Ajouter ▼', addCustom: 'Ajouter nouveau', addBtn: '+ Ajouter', reset: 'Réinitialiser', 
    d1: 'Subhanallah', d2: 'Alhamdulillah', d3: 'Allahu Akbar', d4: 'La ilaha illallah',
    qibla: 'Boussole', north: 'N', east: 'E', south: 'S', west: 'O', qiblaAngle: 'Angle Qibla',
    kibleBtn: 'QIBLA', budget: 'Budget', budgetTitle: 'Budget Quotidien', budgetSubtitle: 'Prévenir le gaspillage',
    budgetSetupTitle: 'Configuration budget', budgetSetupDesc: 'Entrez vos revenus et dépenses fixes.',
    startBtn: 'Démarrer →', monthlyIncome: 'Revenu', fixedExp: 'Dépenses', 
    saveBlessing: 'Enregistrer', spentBtn: 'DÉPENSÉ', amount: 'Montant', changeSettings: 'Changer', 
    changeSettingsTitle: 'Paramètres', sparkleText: "L'économie d'hier est la bénédiction d'aujourd'hui!",
    fastExpense: 'Dépense Rapide', openNotebook: '📖 Ouvrir le carnet', notebookTitle: 'Carnet',
    notebookPlaceholder: 'Où avez-vous dépensé ?',
    budgetInfoText: 'Calcule votre limite quotidienne en divisant votre argent restant.',
    resetSpend: 'Réinitialiser', resetBudget: 'Réinitialiser', tools: 'Guide', toolsTitle: 'Guide', toolsSubtitle: 'Guides utiles',
    calibrate: 'Bougez votre appareil en forme de 8'
  },
  es: { 
    welcome: 'Bienvenido', settings: 'Ajustes', autoLocation: 'Ubicación auto', 
    currentLocation: 'Tu ubicación', city: 'Estambul, Turquía', notifications: 'Notificaciones', 
    language: 'Idioma', close: 'Cerrar', localeCode: 'es-ES', languageName: 'Español', 
    imsak: 'Fajr', sun: 'Amanecer', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', 
    timeLeft: 'Tiempo restante', biorhythm: 'Biorritmo', physical: 'Físico', emotional: 'Emocional', 
    intellectual: 'Intelectual', esma: 'Nombres de Allah', infoTitle: 'Information', 
    bioInfo: 'El biorritmo muestra los cycles de energía desde el nacimiento.', 
    esmaInfo: 'Recuerda uno de los 99 nombres de Allah cada día.', 
    elifbaTitle: 'Elifba y Juego', 
    elifbaInfo: 'Toca las cartas para aprender. ¡Desliza a la derecha para jugar!',
    prayerTimesTitle: 'HORARIOS', adhanPlaying: 'Adhan sonando...', prayerTimeArrived: 'Ha llegado la hora',
    zikirmatik: 'Dhikr', home: 'Inicio', quran: 'Corán', tapToCount: 'DHIKR', 
    selectDhikr: 'Seleccionar / Añadir ▼', addCustom: 'Añadir nuevo', addBtn: '+ Añadir', reset: 'Reiniciar', 
    d1: 'Subhanallah', d2: 'Alhamdulillah', d3: 'Allahu Akbar', d4: 'La ilaha illallah',
    qibla: 'Brújula', north: 'N', east: 'E', south: 'S', west: 'O', qiblaAngle: 'Ángulo Qibla',
    kibleBtn: 'QIBLA', budget: 'Presupuesto', budgetTitle: 'Presupuesto', budgetSubtitle: 'Prevenir Desperdicio',
    budgetSetupTitle: 'Configuración', budgetSetupDesc: 'Ingresa tus ingresos y gastos fijos.',
    startBtn: 'Comenzar →', monthlyIncome: 'Ingreso', fixedExp: 'Gastos', 
    saveBlessing: 'Guardar', spentBtn: 'GASTADO', amount: 'Monto', changeSettings: 'Cambiar', 
    changeSettingsTitle: 'Ajustes', sparkleText: '✨ ¡El ahorro de ayer es la bendición!',
    fastExpense: 'Gasto Rápido', openNotebook: '📖 Abrir cuaderno', notebookTitle: 'Cuaderno',
    notebookPlaceholder: '¿En qué gastaste?',
    budgetInfoText: 'Calcula su límite diario dividiendo su dinero restante.',
    resetSpend: 'Restablecer', resetBudget: 'Restablecer', tools: 'Guía', toolsTitle: 'Guía', toolsSubtitle: 'Guías utiles',
    calibrate: 'Mueve tu dispositivo en forma de 8'
  },
  de: { 
    welcome: 'Willkommen', settings: 'Einstellungen', autoLocation: 'Auto Standort', 
    currentLocation: 'Ihr Standort', city: 'Istanbul, Türkei', notifications: 'Benachrichtigungen', 
    language: 'Sprache', close: 'Schließen', localeCode: 'de-DE', languageName: 'Deutsch', 
    imsak: 'Fadschr', sun: 'Sonnenaufgang', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Ischa', 
    timeLeft: 'Verbleibende Zeit', biorhythm: 'Biorhythmus', physical: 'Körperlich', emotional: 'Emotional', 
    intellectual: 'Intellektuell', esma: 'Namen Allahs', infoTitle: 'Information', 
    bioInfo: 'Der Biorhythmus zeigt die Energiezyklen seit der Geburt.', 
    esmaInfo: 'Erinnert jeden Tag an einen der 99 Namen Allahs.', 
    elifbaTitle: 'Elifba & Spiel', 
    elifbaInfo: 'Tippen Sie auf die Karten, um zu lernen. Wischen Sie nach rechts zum Spielen!',
    prayerTimesTitle: 'GEBETSZEITEN', adhanPlaying: 'Adhan wird abgespielt...', prayerTimeArrived: 'Zeit gekommen',
    zikirmatik: 'Dhikr', home: 'Startseite', quran: 'Koran', tapToCount: 'DHIKR', 
    selectDhikr: 'Auswählen / Hinzufügen ▼', addCustom: 'Neu hinzufügen', addBtn: '+ Hinzufügen', reset: 'Zurücksetzen', 
    d1: 'Subhanallah', d2: 'Alhamdulillah', d3: 'Allahu Akbar', d4: 'La ilaha illallah',
    qibla: 'Qibla', north: 'N', east: 'O', south: 'S', west: 'W', qiblaAngle: 'Qibla-Winkel',
    kibleBtn: 'QIBLA', budget: 'Budget', budgetTitle: 'Tagesbudget', budgetSubtitle: 'Verschwendung Vermeiden',
    budgetSetupTitle: 'Budget-Setup', budgetSetupDesc: 'Geben Sie Ihr Einkommen und Ihre Fixkosten ein.',
    startBtn: 'Starten →', monthlyIncome: 'Einkommen', fixedExp: 'Fixkosten', 
    saveBlessing: 'Speichern', spentBtn: 'AUSGEGEBEN', amount: 'Betrag', changeSettings: 'Ändern', 
    changeSettingsTitle: 'Einstellungen', sparkleText: '✨ Die Ersparnis von gestern ist der Segen!',
    fastExpense: 'Schnelle Ausgabe', openNotebook: '📖 Ausgabenheft', notebookTitle: 'Notizbuch',
    notebookPlaceholder: 'Wofür haben Sie Geld ausgegeben?',
    budgetInfoText: 'Berechnet Ihr Tageslimit, indem Ihr verbleibendes Geld durch die verbleibenden Tage geteilt wird.',
    resetSpend: 'Zurücksetzen', resetBudget: 'Zurücksetzen', tools: 'Führer', toolsTitle: 'Führer', toolsSubtitle: 'Nützliche Führer',
    calibrate: 'Bewegen Sie Ihr Gerät in einer 8-Form'
  }
};

const quranList = [
  { id: '1', name: '1. Fâtiha Suresi', reciter: 'Mishary Alafasy' },
  { id: '2', name: '2. Bakara Suresi', reciter: 'Mishary Alafasy' },
  { id: '3', name: '3. Âl-i İmrân Suresi', reciter: 'Mishary Alafasy' },
  { id: '4', name: '4. Nisâ Suresi', reciter: 'Mishary Alafasy' },
  { id: '5', name: '5. Mâide Suresi', reciter: 'Mishary Alafasy' },
  { id: '6', name: '6. En\'âm Suresi', reciter: 'Mishary Alafasy' },
  { id: '7', name: '7. A\'râf Suresi', reciter: 'Mishary Alafasy' },
  { id: '8', name: '8. Enfâl Suresi', reciter: 'Mishary Alafasy' },
  { id: '9', name: '9. Tevbe Suresi', reciter: 'Mishary Alafasy' },
  { id: '10', name: '10. Yûnus Suresi', reciter: 'Mishary Alafasy' },
  { id: '11', name: '11. Hûd Suresi', reciter: 'Mishary Alafasy' },
  { id: '12', name: '12. Yûsuf Suresi', reciter: 'Mishary Alafasy' },
  { id: '13', name: '13. Ra\'d Suresi', reciter: 'Mishary Alafasy' },
  { id: '14', name: '14. İbrâhim Suresi', reciter: 'Mishary Alafasy' },
  { id: '15', name: '15. Hicr Suresi', reciter: 'Mishary Alafasy' },
  { id: '16', name: '16. Nahl Suresi', reciter: 'Mishary Alafasy' },
  { id: '17', name: '17. İsrâ Suresi', reciter: 'Mishary Alafasy' },
  { id: '18', name: '18. Kehf Suresi', reciter: 'Mishary Alafasy' },
  { id: '19', name: '19. Meryem Suresi', reciter: 'Mishary Alafasy' },
  { id: '20', name: '20. Tâhâ Suresi', reciter: 'Mishary Alafasy' },
  { id: '21', name: '21. Enbiyâ Suresi', reciter: 'Mishary Alafasy' },
  { id: '22', name: '22. Hac Suresi', reciter: 'Mishary Alafasy' },
  { id: '23', name: '23. Mü\'minûn Suresi', reciter: 'Mishary Alafasy' },
  { id: '24', name: '24. Nûr Suresi', reciter: 'Mishary Alafasy' },
  { id: '25', name: '25. Furkan Suresi', reciter: 'Mishary Alafasy' },
  { id: '26', name: '26. Şuarâ Suresi', reciter: 'Mishary Alafasy' },
  { id: '27', name: '27. Neml Suresi', reciter: 'Mishary Alafasy' },
  { id: '28', name: '28. Kasas Suresi', reciter: 'Mishary Alafasy' },
  { id: '29', name: '29. Ankebût Suresi', reciter: 'Mishary Alafasy' },
  { id: '30', name: '30. Rûm Suresi', reciter: 'Mishary Alafasy' },
  { id: '31', name: '31. Lokmân Suresi', reciter: 'Mishary Alafasy' },
  { id: '32', name: '32. Secde Suresi', reciter: 'Mishary Alafasy' },
  { id: '33', name: '33. Ahzâb Suresi', reciter: 'Mishary Alafasy' },
  { id: '34', name: '34. Sebe\' Suresi', reciter: 'Mishary Alafasy' },
  { id: '35', name: '35. Fâtır Suresi', reciter: 'Mishary Alafasy' },
  { id: '36', name: '36. Yâsin Suresi', reciter: 'Mishary Alafasy' },
  { id: '37', name: '37. Sâffât Suresi', reciter: 'Mishary Alafasy' },
  { id: '38', name: '38. Sâd Suresi', reciter: 'Mishary Alafasy' },
  { id: '39', name: '39. Zümer Suresi', reciter: 'Mishary Alafasy' },
  { id: '40', name: '40. Mü\'min Suresi', reciter: 'Mishary Alafasy' },
  { id: '41', name: '41. Fussilet Suresi', reciter: 'Mishary Alafasy' },
  { id: '42', name: '42. Şûrâ Suresi', reciter: 'Mishary Alafasy' },
  { id: '43', name: '43. Zuhruf Suresi', reciter: 'Mishary Alafasy' },
  { id: '44', name: '44. Duhân Suresi', reciter: 'Mishary Alafasy' },
  { id: '45', name: '45. Câsiye Suresi', reciter: 'Mishary Alafasy' },
  { id: '46', name: '46. Ahkâf Suresi', reciter: 'Mishary Alafasy' },
  { id: '47', name: '47. Muhammed Suresi', reciter: 'Mishary Alafasy' },
  { id: '48', name: '48. Fetih Suresi', reciter: 'Mishary Alafasy' },
  { id: '49', name: '49. Hucurât Suresi', reciter: 'Mishary Alafasy' },
  { id: '50', name: '50. Kaf Suresi', reciter: 'Mishary Alafasy' },
  { id: '51', name: '51. Zâriyât Suresi', reciter: 'Mishary Alafasy' },
  { id: '52', name: '52. Tûr Suresi', reciter: 'Mishary Alafasy' },
  { id: '53', name: '53. Necm Suresi', reciter: 'Mishary Alafasy' },
  { id: '54', name: '54. Kamer Suresi', reciter: 'Mishary Alafasy' },
  { id: '55', name: '55. Rahmân Suresi', reciter: 'Mishary Alafasy' },
  { id: '56', name: '56. Vâkıa Suresi', reciter: 'Mishary Alafasy' },
  { id: '57', name: '57. Hadîd Suresi', reciter: 'Mishary Alafasy' },
  { id: '58', name: '58. Mücâdele Suresi', reciter: 'Mishary Alafasy' },
  { id: '59', name: '59. Haşr Suresi', reciter: 'Mishary Alafasy' },
  { id: '60', name: '60. Mümtehine Suresi', reciter: 'Mishary Alafasy' },
  { id: '61', name: '61. Saf Suresi', reciter: 'Mishary Alafasy' },
  { id: '62', name: '62. Cuma Suresi', reciter: 'Mishary Alafasy' },
  { id: '63', name: '63. Münâfikûn Suresi', reciter: 'Mishary Alafasy' },
  { id: '64', name: '64. Teğâbün Suresi', reciter: 'Mishary Alafasy' },
  { id: '65', name: '65. Talâk Suresi', reciter: 'Mishary Alafasy' },
  { id: '66', name: '66. Tahrîm Suresi', reciter: 'Mishary Alafasy' },
  { id: '67', name: '67. Mülk Suresi', reciter: 'Mishary Alafasy' },
  { id: '68', name: '68. Kalem Suresi', reciter: 'Mishary Alafasy' },
  { id: '69', name: '69. Hâkka Suresi', reciter: 'Mishary Alafasy' },
  { id: '70', name: '70. Meâric Suresi', reciter: 'Mishary Alafasy' },
  { id: '71', name: '71. Nûh Suresi', reciter: 'Mishary Alafasy' },
  { id: '72', name: '72. Cin Suresi', reciter: 'Mishary Alafasy' },
  { id: '73', name: '73. Müzzemmil Suresi', reciter: 'Mishary Alafasy' },
  { id: '74', name: '74. Müddessir Suresi', reciter: 'Mishary Alafasy' },
  { id: '75', name: '75. Kıyâme Suresi', reciter: 'Mishary Alafasy' },
  { id: '76', name: '76. İnsân Suresi', reciter: 'Mishary Alafasy' },
  { id: '77', name: '77. Mürselât Suresi', reciter: 'Mishary Alafasy' },
  { id: '78', name: '78. Nebe\' Suresi', reciter: 'Mishary Alafasy' },
  { id: '79', name: '79. Nâziât Suresi', reciter: 'Mishary Alafasy' },
  { id: '80', name: '80. Abese Suresi', reciter: 'Mishary Alafasy' },
  { id: '81', name: '81. Tekvîr Suresi', reciter: 'Mishary Alafasy' },
  { id: '82', name: '82. İnfitâr Suresi', reciter: 'Mishary Alafasy' },
  { id: '83', name: '83. Mutaffifîn Suresi', reciter: 'Mishary Alafasy' },
  { id: '84', name: '84. İnşikâk Suresi', reciter: 'Mishary Alafasy' },
  { id: '85', name: '85. Bürûc Suresi', reciter: 'Mishary Alafasy' },
  { id: '86', name: '86. Târık Suresi', reciter: 'Mishary Alafasy' },
  { id: '87', name: '87. A\'lâ Suresi', reciter: 'Mishary Alafasy' },
  { id: '88', name: '88. Gâşiye Suresi', reciter: 'Mishary Alafasy' },
  { id: '89', name: '89. Fecr Suresi', reciter: 'Mishary Alafasy' },
  { id: '90', name: '90. Beled Suresi', reciter: 'Mishary Alafasy' },
  { id: '91', name: '91. Şems Suresi', reciter: 'Mishary Alafasy' },
  { id: '92', name: '92. Leyl Suresi', reciter: 'Mishary Alafasy' },
  { id: '93', name: '93. Duhâ Suresi', reciter: 'Mishary Alafasy' },
  { id: '94', name: '94. İnşirâh Suresi', reciter: 'Mishary Alafasy' },
  { id: '95', name: '95. Tîn Suresi', reciter: 'Mishary Alafasy' },
  { id: '96', name: '96. Alak Suresi', reciter: 'Mishary Alafasy' },
  { id: '97', name: '97. Kadir Suresi', reciter: 'Mishary Alafasy' },
  { id: '98', name: '98. Beyyine Suresi', reciter: 'Mishary Alafasy' },
  { id: '99', name: '99. Zilzâl Suresi', reciter: 'Mishary Alafasy' },
  { id: '100', name: '100. Âdiyât Suresi', reciter: 'Mishary Alafasy' },
  { id: '101', name: '101. Kâria Suresi', reciter: 'Mishary Alafasy' },
  { id: '102', name: '102. Tekâsür Suresi', reciter: 'Mishary Alafasy' },
  { id: '103', name: '103. Asr Suresi', reciter: 'Mishary Alafasy' },
  { id: '104', name: '104. Hümeze Suresi', reciter: 'Mishary Alafasy' },
  { id: '105', name: '105. Fîl Suresi', reciter: 'Mishary Alafasy' },
  { id: '106', name: '106. Kureyş Suresi', reciter: 'Mishary Alafasy' },
  { id: '107', name: '107. Mâûn Suresi', reciter: 'Mishary Alafasy' },
  { id: '108', name: '108. Kevser Suresi', reciter: 'Mishary Alafasy' },
  { id: '109', name: '109. Kâfirûn Suresi', reciter: 'Mishary Alafasy' },
  { id: '110', name: '110. Nasr Suresi', reciter: 'Mishary Alafasy' },
  { id: '111', name: '111. Tebbet Suresi', reciter: 'Mishary Alafasy' },
  { id: '112', name: '112. İhlâs Suresi', reciter: 'Mishary Alafasy' },
  { id: '113', name: '113. Felak Suresi', reciter: 'Mishary Alafasy' },
  { id: '114', name: '114. Nâs Suresi', reciter: 'Mishary Alafasy' }
];

const esmaUlHusnaList = [
  { id: 1, name: "Allah (C.C.)", desc: "Eşi benzeri olmayan, bütün noksan sıfatlardan münezzeh tek ilah." },
  { id: 2, name: "Er-Rahmân", desc: "Dünyada bütün mahlukata merhamet eden, şefkat gösteren, ihsan eden." },
  { id: 3, name: "Er-Rahîm", desc: "Ahirette, müminlere sonsuz ikram, lütuf ve ihsanda bulunan." },
  { id: 4, name: "El-Melik", desc: "Mülkün, kainatın sahibi, mülk ve saltanatı devamlı olan." },
  { id: 5, name: "El-Kuddûs", desc: "Her türlü eksiklikten uzak, bütün kemal sıfatlarla muttasıf olan." },
  { id: 6, name: "Es-Selâm", desc: "Her türlü tehlikelerden selamete çıkaran." },
  { id: 7, name: "El-Mü'min", desc: "Güven veren, emin kılan, koruyan." },
  { id: 8, name: "El-Müheymin", desc: "Her şeyi görüp gözeten, her varlığın yaptıklarından haberdar olan." },
  { id: 9, name: "El-Azîz", desc: "İzzet sahibi, her şeye galip olan." },
  { id: 10, name: "El-Cebbâr", desc: "Azamet ve kudret sahibi. Dilediğini yapmaya muktedir olan." },
  { id: 11, name: "El-Mütekebbir", desc: "Büyüklükte eşi, benzeri olmayan." },
  { id: 12, name: "El-Hâlık", desc: "Yaratan, yoktan var eden." },
  { id: 13, name: "El-Bâri", desc: "Her şeyi kusursuz ve uyumlu yaratan." },
  { id: 14, name: "El-Musavvir", desc: "Varlıklara şekil veren." },
  { id: 15, name: "El-Gaffâr", desc: "Günahları örten ve çok mağfiret eden." },
  { id: 16, name: "El-Kahhâr", desc: "Her şeye, her istendiğini yapacak surette, galip ve hakim olan." },
  { id: 17, name: "El-Vehhâb", desc: "Karşılıksız hibeler veren, çok fazla ihsan eden." },
  { id: 18, name: "Er-Rezzâk", desc: "Bütün mahlukatın rızkını veren ve ihtiyacını karşılayan." },
  { id: 19, name: "El-Fettâh", desc: "Her türlü sıkıntıları gideren." },
  { id: 20, name: "El-Alîm", desc: "Gizli açık, geçmiş, gelecek, her şeyi en ince detayına kadar bilen." },
  { id: 21, name: "El-Kâbıd", desc: "Dilediğinin rızkını daraltan, ruhları alan." },
  { id: 22, name: "El-Bâsıt", desc: "Dilediğinin rızkını genişleten, ruhları veren." },
  { id: 23, name: "El-Hâfıd", desc: "Kafir ve fâcirleri alçaltan." },
  { id: 24, name: "Er-Râfi", desc: "Müminleri yücelten." },
  { id: 25, name: "El-Mu'ız", desc: "Dilediğini aziz eden, izzet veren." },
  { id: 26, name: "El-Müzil", desc: "Dilediğini zillete düşüren." },
  { id: 27, name: "Es-Semî", desc: "Her şeyi en iyi işiten." },
  { id: 28, name: "El-Basîr", desc: "Gizli açık, her şeyi en iyi gören." },
  { id: 29, name: "El-Hakem", desc: "Mutlak hakim, hakkı batıldan ayıran." },
  { id: 30, name: "El-Adl", desc: "Mutlak adil, çok adaletli." },
  { id: 31, name: "El-Latîf", desc: "Lütuf ve ihsan sahibi olan. Bütün incelikleri bilen." },
  { id: 32, name: "El-Habîr", desc: "Olmuş olacak her şeyden haberdar." },
  { id: 33, name: "El-Halîm", desc: "Cezada, acele etmeyen, yumuşak davranan." },
  { id: 34, name: "El-Azîm", desc: "Büyüklükte benzeri yok. Pek yüce." },
  { id: 35, name: "El-Gafûr", desc: "Affı, mağfireti bol." },
  { id: 36, name: "Eş-Şekûr", desc: "Az amele, çok sevap veren." },
  { id: 37, name: "El-Aliyy", desc: "Yüceler yücesi, çok yüce." },
  { id: 38, name: "El-Kebîr", desc: "Büyüklükte eşi, benzeri yok." },
  { id: 39, name: "El-Hafîz", desc: "Her şeyi koruyucu olan." },
  { id: 40, name: "El-Mukît", desc: "Her yaratılmışın rızkını, gıdasını veren, tayin eden." },
  { id: 41, name: "El-Hasîb", desc: "Kulların hesabını en iyi gören." },
  { id: 42, name: "El-Celîl", desc: "Celal ve azamet sahibi olan." },
  { id: 43, name: "El-Kerîm", desc: "Keremi, lütuf ve ihsanı bol, karşılıksız veren." },
  { id: 44, name: "Er-Rakîb", desc: "Her varlığı, her işi her an gözeten. Bütün işleri murakabesi altında bulunduran." },
  { id: 45, name: "El-Mücîb", desc: "Duaları, istekleri kabul eden." },
  { id: 46, name: "El-Vâsi", desc: "Rahmet, kudret ve ilmi ile her şeyi ihata eden." },
  { id: 47, name: "El-Hakîm", desc: "Her işi hikmetli, her şeyi hikmetle yaratan." },
  { id: 48, name: "El-Vedûd", desc: "Kullarını en fazla loving, sevilmeye en layık olan." },
  { id: 49, name: "El-Mecîd", desc: "Her türlü övgüye layık bulunan." },
  { id: 50, name: "El-Bâis", desc: "Ölüleri dirilten." },
  { id: 51, name: "Eş-Şehîd", desc: "Her zaman her yerde hazır ve nazır olan." },
  { id: 52, name: "El-Hakk", desc: "Varlığı hiç değişmeden duran. Var olan, hakkı ortaya çıkaran." },
  { id: 53, name: "El-Vekîl", desc: "Kulların işlerini bitiren. Kendisine tevekkül edenlerin işlerini en iyi neticeye ulaştıran." },
  { id: 54, name: "El-Kaviyy", desc: "Kudreti en üstün ve hiç azalmaz." },
  { id: 55, name: "El-Metîn", desc: "Kuvvet ve kudret menbaı, pek güçlü." },
  { id: 56, name: "El-Veliyy", desc: "İnananların dostu, onları sevip yardım eden." },
  { id: 57, name: "El-Hamîd", desc: "Her türlü hamd ve senaya layık olan." },
  { id: 58, name: "El-Muhsî", desc: "Yarattığı ve yaratacağı bütün varlıkların sayısını bilen." },
  { id: 59, name: "El-Mübdi", desc: "Maddesiz, örneksiz yaratan." },
  { id: 60, name: "El-Muîd", desc: "Yarattıklarını yok edip, sonra tekrar diriltecek olan." },
  { id: 61, name: "El-Muhyî", desc: "İhya eden, dirilten, can veren." },
  { id: 62, name: "El-Mümît", desc: "Her canlıya ölümü tattıran." },
  { id: 63, name: "El-Hayy", desc: "Ezeli ve ebedi hayata sahip olan." },
  { id: 64, name: "El-Kayyûm", desc: "Varlıkları diri tutan, zatı ile kaim olan." },
  { id: 65, name: "El-Vâcid", desc: "Kendisinden hiçbir şey gizli olmayan, istediğini, istediği vakit bulan." },
  { id: 66, name: "El-Mâcid", desc: "Kadri ve şanı büyük, keremi, ihsanı bol olan." },
  { id: 67, name: "El-Vâhid", desc: "Zat, sıfat ve fiillerinde benzeri ve ortağı olmayan, tek olan." },
  { id: 68, name: "Es-Samed", desc: "Hiçbir şeye ihtiyacı olmayan, herkesin muhtaç olduğu." },
  { id: 69, name: "El-Kâdir", desc: "Dilediğini dilediği gibi yaratmaya muktedir olan." },
  { id: 70, name: "El-Muktedir", desc: "Dilediği gibi tasarruf eden, her şeyi kolayca yaratan kudret sahibi." },
  { id: 71, name: "El-Mukaddim", desc: "Dilediğini, öne alan, yükselten." },
  { id: 72, name: "El-Muahhir", desc: "Dilediğini sona alan, erteleyen, alçaltan." },
  { id: 73, name: "El-Evvel", desc: "Ezeli olan, varlığının başlangıcı olmayan." },
  { id: 74, name: "El-Âhir", desc: "Ebedi olan, varlığının sonu olmayan." },
  { id: 75, name: "Ez-Zâhir", desc: "Yarattıkları ile varlığı açık, aşikar olan." },
  { id: 76, name: "El-Bâtın", desc: "Aklın tasavvurundan gizli olan." },
  { id: 77, name: "El-Vâlî", desc: "Bütün kainatı idare eden." },
  { id: 78, name: "El-Müteâlî", desc: "Son derece yüce olan." },
  { id: 79, name: "El-Berr", desc: "İyilik ve ihsanı bol, iyilik ve ihsan kaynağı." },
  { id: 80, name: "Et-Tevvâb", desc: "Tövbeleri kabul edip, günahları bağışlayan." },
  { id: 81, name: "El-Müntakim", desc: "Zalimlerin cezasını veren, intikam alan." },
  { id: 82, name: "El-Afüvv", desc: "Affı çok olan, günahları affeden." },
  { id: 83, name: "Er-Raûf", desc: "Çok merhametli, pek şefkatli." },
  { id: 84, name: "Mâlik-ül Mülk", desc: "Mülkün, her varlığın asıl sahibi." },
  { id: 85, name: "Zül-Celâli vel İkrâm", desc: "Celal, azamet ve pek büyük ikram sahibi." },
  { id: 86, name: "El-Muksit", desc: "Her işi birbirine uygun yapan." },
  { id: 87, name: "El-Câmi", desc: "Mahşerde her mahlukatı bir araya toplayan." },
  { id: 88, name: "El-Ganiyy", desc: "Her türlü zenginlik sahibi, ihtiyacı olmayan." },
  { id: 89, name: "El-Muğnî", desc: "Müstağni kılan. İhtiyaç gideren, zengin eden." },
  { id: 90, name: "El-Mâni", desc: "Dilemediği şeye mani olan, engelleyen." },
  { id: 91, name: "Ed-Dârr", desc: "Elem, zarar verenleri yaratan." },
  { id: 92, name: "En-Nâfi", desc: "Fayda veren şeyleri yaratan." },
  { id: 93, name: "En-Nûr", desc: "Alemleri nurlandıran, dilediğine nur veren." },
  { id: 94, name: "El-Hâdî", desc: "Hidayet veren." },
  { id: 95, name: "El-Bedî", desc: "Eşi ve benzeri olmayan güzellikte yaratıcı." },
  { id: 96, name: "El-Bâkî", desc: "Varlığının sonu olmayan, ebedi olan." },
  { id: 97, name: "El-Vâris", desc: "Her şeyin asıl sahibi olan." },
  { id: 98, name: "Er-Reşîd", desc: "İrşada muhtaç olmayan, doğru yolu gösteren." },
  { id: 99, name: "Es-Sabûr", desc: "Ceza vermede acele etmeyen." }
];

const elifbaList = [
  { id: 1, ar: 'ا', tr: 'Elif' }, { id: 2, ar: 'ب', tr: 'Be' }, { id: 3, ar: 'ت', tr: 'Te' },
  { id: 4, ar: 'ث', tr: 'Se' }, { id: 5, ar: 'ج', tr: 'Cim' }, { id: 6, ar: 'ح', tr: 'Ha' },
  { id: 7, ar: 'خ', tr: 'Hı' }, { id: 8, ar: 'د', tr: 'Dal' }, { id: 9, ar: 'ذ', tr: 'Zel' },
  { id: 10, ar: 'ر', tr: 'Ra' }, { id: 11, ar: 'ز', tr: 'Ze' }, { id: 12, ar: 'س', tr: 'Sin' },
  { id: 13, ar: 'ش', tr: 'Şın' }, { id: 14, ar: 'ص', tr: 'Sad' }, { id: 15, ar: 'ض', tr: 'Dat' },
  { id: 16, ar: 'ط', tr: 'Tı' }, { id: 17, ar: 'ظ', tr: 'Zı' }, { id: 18, ar: 'ع', tr: 'Ayn' },
  { id: 19, ar: 'غ', tr: 'Gayn' }, { id: 20, ar: 'ف', tr: 'Fe' }, { id: 21, ar: 'ق', tr: 'Kaf' },
  { id: 22, ar: 'ك', tr: 'Kef' }, { id: 23, ar: 'ل', tr: 'Lam' }, { id: 24, ar: 'م', tr: 'Mim' },
  { id: 25, ar: 'ن', tr: 'Nun' }, { id: 26, ar: 'و', tr: 'Vav' }, { id: 27, ar: 'ه', tr: 'He' },
  { id: 28, ar: 'ي', tr: 'Ye' }
];

const gameLetters = [
  { id: 1, ar: 'ا', tr: 'Elif' }, { id: 2, ar: 'ب', tr: 'Be' }, { id: 3, ar: 'ت', tr: 'Te' },
  { id: 4, ar: 'ث', tr: 'Se' }, { id: 5, ar: 'ج', tr: 'Cim' }, { id: 6, ar: 'ح', tr: 'Ha' },
  { id: 7, ar: 'خ', tr: 'Hı' }, { id: 8, ar: 'د', tr: 'Dal' }
];

const cumaMesajlariListesi = [
  "Güneşin doğduğu en hayırlı gün Cumadır. Dualarınızın kabul olması dileğiyle. Hayırlı Cumalar.",
  "Rabbim bizi, özünden iman edip, gözünden düşmeyen kullarından eylesin. Cumamız mübarek olsun.",
  "Gönüller duada birleşince Cumalar güzelleşir. Selam ve dua ile...",
  "Allah'ın rahmeti, bereketi ve mağfireti üzerinize olsun. Hayırlı Cumalar.",
  "Duaların geri çevrilmeyeceği bu mübarek günde, kalbinizden geçenler ömrünüze yazılsın. Hayırlı Cumalar.",
  "Cuma gününüz, kalbinize huzur, evinize bereket, ruhunuza ferahlık getirsin. Hayırlı Cumalar.",
  "Umutsuz kapılar vardır açılmaz, Rabbimin kapısı büyüktür kapanmaz. Hayırlı Cumalar.",
  "Allah'ım! Bizi bağışla, bize merhamet et ve bizi doğru yola ilet. Cumamız mübarek olsun.",
  "Gününüz nurlu, cumanız mübarek olsun. Dualarda buluşmak ümidiyle...",
  "Her yeni gün bir umut, her Cuma bir rahmettir. Rabbim rahmetini üzerimizden eksik etmesin. Hayırlı Cumalar."
];

const abdestSteps = [
  { id: 1, img: require('./assets/a1.png') }, { id: 2, img: require('./assets/a2.png') },
  { id: 3, img: require('./assets/a3.png') }, { id: 4, img: require('./assets/a4.png') },
  { id: 5, img: require('./assets/a5.png') }, { id: 6, img: require('./assets/a6.png') }
];

const gusulSteps = [
  { id: 1, img: require('./assets/g1.png') }, { id: 2, img: require('./assets/g2.png') }, { id: 3, img: require('./assets/g3.png') }
];

const teyemmumSteps = [
  { id: 1, img: require('./assets/t1.png') }, { id: 2, img: require('./assets/t2.png') },
  { id: 3, img: require('./assets/t3.png') }, { id: 4, img: require('./assets/t4.png') },
  { id: 5, img: require('./assets/t5.png') }, { id: 6, img: require('./assets/t6.png') }
];

const namazSteps = [
  { id: 1, title: "1. Niyet ve İftitah Tekbiri", desc: "Namazın şartları (abdest, setr-i avret, istikbal-i kıble vs.) yerine getirildikten sonra kılınacak namaza niyet edilir. 'Niyet ettim Allah rızası için bugünkü Sabah namazının farzını kılmaya' denir ve 'Allahu Ekber' diyerek eller kulak hizasına kaldırılıp tekbir getirilir." },
  { id: 2, title: "2. Kıyam ve Kıraat (Ayakta Okuma)", desc: "Ayakta dik durulur. Önce Sübhaneke okunur, Euzü Besmele çekilir. Fatiha Suresi okunur ve 'Amin' denir. Ardından Kur'an'dan en az 3 kısa ayet veya 1 uzun ayet (Zamm-ı Sure) okunur." },
  { id: 3, title: "3. Rüku (Eğilme)", desc: "'Allahu Ekber' diyerek rükuya eğilinir. Eller diz kapaklarını kavrar, sırt düz tutulur. 3 defa 'Sübhâne Rabbiye'l-Azîm' denir. Doğrulurken 'Semiallahü limen hamideh', tam doğrulunca 'Rabbena lekel hamd' denir." },
  { id: 4, title: "4. Secde", desc: "'Allahu Ekber' diyerek önce dizler, sonra eller, sonra alın ve burun yere konur (Secde). 3 defa 'Sübhâne Rabbiye'l-A'lâ' denir. 'Allahu Ekber' diyerek oturulur, kısa bir beklemeden sonra tekrar 'Allahu Ekber' diyerek 2. defa secdeye gidilir ve yine 3 defa aynı dua okunur." },
  { id: 5, title: "5. Kade (Oturuş) ve Selam", desc: "Secdeden sonra dizler üzerine oturulur (Tahiyyat oturuşu). Ettahiyyatü, Allahümme Salli, Allahümme Barik ve Rabbena duaları okunur. Önce sağ omuza bakarak 'Esselâmü aleyküm ve rahmetullah', sonra sol omuza bakarak aynı şekilde selam verilir ve namaz bitirilir." }
];

// --- GERÇEK TAKVİM HESAPLAMALARI ---
const getHicriDate = () => {
  try {
    return new Intl.DateTimeFormat('tr-TR-u-ca-islamic', { 
      day: 'numeric', month: 'long', year: 'numeric' 
    }).format(new Date());
  } catch (e) {
    return "21 Ramazan 1447"; 
  }
};

const getRumiDate = () => {
  const today = new Date();
  const rumiDate = new Date(today.getTime());
  rumiDate.setDate(rumiDate.getDate() - 13);
  
  const monthNames = [
    "Kânûn-ı Sânî", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
    "Temmuz", "Ağustos", "Eylül", "Teşrin-i Evvel", "Teşrin-i Sânî", "Kânûn-ı Evvel"
  ];
  
  let rumiYear = today.getFullYear() - 584;
  if (today.getMonth() < 2 || (today.getMonth() === 2 && today.getDate() < 14)) {
     rumiYear -= 1;
  }
  
  return {
     day: rumiDate.getDate(),
     month: monthNames[rumiDate.getMonth()],
     year: rumiYear
  };
};

const getMaarifNote = () => {
  const today = new Date();
  const m = today.getMonth(); 
  const d = today.getDate();
  
  if (m === 2 && d >= 10 && d <= 17) {
    return "Bugün Kocakarı Soğukları (Berdül'acüz) başlangıcıdır. Halk takvimine göre kapı önünde kışın son sert soğuklarının hissedildiği dönem olarak bilinir.";
  }
  if (m === 2 && d === 21) {
     return "Bugün Nevruz Günü. Baharın başlangıcı, gece ile gündüzün eşitlendiği gün.";
  }
  return "\"İki günü bir olan ziyandadır.\"\n- Hz. Muhammed (s.a.v)";
};

const KaabaIcon = () => ( <View style={styles.kaabaIconContainer}><View style={styles.kaabaGoldBand} /></View> );
const PlayIcon = () => ( <View style={{ width: 0, height: 0, borderStyle: 'solid', borderLeftWidth: 20, borderTopWidth: 12, borderBottomWidth: 12, borderLeftColor: '#050812', borderTopColor: 'transparent', borderBottomColor: 'transparent', marginLeft: 6 }} /> );
const PauseIcon = () => ( <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 16, height: 22 }}><View style={{ width: 6, height: '100%', backgroundColor: '#050812', borderRadius: 2 }} /><View style={{ width: 6, height: '100%', backgroundColor: '#050812', borderRadius: 2 }} /></View> );
const PrevIcon = () => ( <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 4, height: 18, backgroundColor: '#E0E6ED', borderRadius: 2, marginRight: -2 }} /><View style={{ width: 0, height: 0, borderStyle: 'solid', borderRightWidth: 14, borderTopWidth: 10, borderBottomWidth: 10, borderRightColor: '#E0E6ED', borderTopColor: 'transparent', borderBottomColor: 'transparent' }} /></View> );
const NextIcon = () => ( <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 0, height: 0, borderStyle: 'solid', borderLeftWidth: 14, borderTopWidth: 10, borderBottomWidth: 10, borderLeftColor: '#E0E6ED', borderTopColor: 'transparent', borderBottomColor: 'transparent' }} /><View style={{ width: 4, height: 18, backgroundColor: '#E0E6ED', borderRadius: 2, marginLeft: -2 }} /></View> );
const MoneyBagIcon = ({ active }: { active: boolean }) => ( <Text style={{ fontSize: 20, marginBottom: 4, opacity: active ? 1 : 0.6 }}>💰</Text> );

const Star = ({ size, top, left, delay }: { size: number; top: number; left: number; delay: number }) => {
  const opacity = useRef(new Animated.Value(0.1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: Math.random() * 0.8 + 0.2, duration: 1000 + Math.random() * 2000, delay, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.1, duration: 1000 + Math.random() * 2000, useNativeDriver: true })
    ])).start();
  }, [delay, opacity]);
  return <Animated.View style={{ position: 'absolute', top, left, width: size, height: size, backgroundColor: '#FFFFFF', borderRadius: size / 2, opacity, shadowColor: '#FFFFFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: size + 2 }} />;
};

const PrayerTimer = ({ liveTimings, t, onPrayerTime, onNextPrayerChange }: any) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nextPrayerData, setNextPrayerData] = useState({ name: 'İmsak', timeKey: 'Imsak' });
  const [prayerCountdown, setPrayerCountdown] = useState('00:00:00');
  const adhanPlayedRef = useRef(false);
  const lastPrayerNameRef = useRef('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const times = [
        { name: t.imsak, timeKey: 'Imsak' },
        { name: t.sun, timeKey: 'Sunrise' },
        { name: t.dhuhr, timeKey: 'Dhuhr' },
        { name: t.asr, timeKey: 'Asr' },
        { name: t.maghrib, timeKey: 'Maghrib' },
        { name: t.isha, timeKey: 'Isha' }
      ];

      let nPrayer = times[0];
      let minDiff = Infinity;

      times.forEach(p => {
        const [hours, minutes] = liveTimings[p.timeKey as keyof typeof liveTimings].split(':').map(Number);
        let pDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
        if (pDate.getTime() - now.getTime() < 0) {
          pDate.setDate(pDate.getDate() + 1);
        }
        let diff = pDate.getTime() - now.getTime();
        if (diff < minDiff) {
          minDiff = diff;
          nPrayer = p;
        }
      });

      const hoursLeft = Math.floor((minDiff / (1000 * 60 * 60)) % 24);
      const minutesLeft = Math.floor((minDiff / 1000 / 60) % 60);
      const secondsLeft = Math.floor((minDiff / 1000) % 60);
      
      setNextPrayerData(nPrayer);
      setPrayerCountdown(`${hoursLeft.toString().padStart(2, '0')}:${minutesLeft.toString().padStart(2, '0')}:${secondsLeft.toString().padStart(2, '0')}`);

      if (lastPrayerNameRef.current !== nPrayer.name) {
         lastPrayerNameRef.current = nPrayer.name;
         onNextPrayerChange(nPrayer.name);
      }

      if (hoursLeft === 0 && minutesLeft === 0 && secondsLeft === 0 && nPrayer.timeKey !== 'Sunrise') {
        if (!adhanPlayedRef.current) {
          adhanPlayedRef.current = true;
          onPrayerTime(nPrayer.name); 
        }
      } else if (secondsLeft > 2) {
        adhanPlayedRef.current = false;
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [liveTimings, t, onPrayerTime, onNextPrayerChange]);

  return (
    <View style={styles.heroSection}>
      <Text style={styles.dateText} adjustsFontSizeToFit numberOfLines={1}>
        {currentTime.toLocaleDateString(t.localeCode, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </Text>
      <Text style={styles.clockText} adjustsFontSizeToFit numberOfLines={1}>
        {currentTime.toLocaleTimeString(t.localeCode, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </Text>
      <View style={styles.countdownBox}>
        <Text style={styles.countdownLabel}>{nextPrayerData.name} • {t.timeLeft}</Text>
        <Text style={styles.countdownTime}>{prayerCountdown}</Text>
      </View>
    </View>
  );
};

const ElifbaCard = ({ item, soundEnabled }: any) => {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);

  const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backInterpolate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });

  const playSound = () => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=gtx&q=${encodeURIComponent(item.ar)}`;
    const sound = new Sound(url, undefined, (error: any) => {
      if (!error) { sound.play(() => { sound.release(); }); }
    });
  };

  const flipCard = () => {
    if (!flipped && soundEnabled) playSound();
    Animated.spring(flipAnim, { toValue: flipped ? 0 : 180, friction: 8, tension: 10, useNativeDriver: true }).start();
    setFlipped(!flipped);
  };

  return (
    <TouchableOpacity onPress={flipCard} activeOpacity={0.9} style={{ margin: width * 0.02 }}>
      <View style={styles.elifbaCardContainer}>
        <Animated.View style={[styles.elifbaCardFront, { transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }] }]}>
          <Text style={styles.elifbaArText}>{item.ar}</Text>
        </Animated.View>
        <Animated.View style={[styles.elifbaCardBack, { transform: [{ perspective: 1000 }, { rotateY: backInterpolate }] }]}>
          <Text style={styles.elifbaTrText}>{item.tr}</Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

const MemoryCard = ({ item, onPress }: any) => {
  const flipAnim = useRef(new Animated.Value(item.isFlipped || item.isMatched ? 180 : 0)).current;

  useEffect(() => {
    Animated.spring(flipAnim, {
      toValue: item.isFlipped || item.isMatched ? 180 : 0,
      friction: 8, tension: 10, useNativeDriver: true
    }).start();
  }, [item.isFlipped, item.isMatched]);

  const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backInterpolate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ margin: width * 0.015 }} disabled={item.isFlipped || item.isMatched}>
      <View style={styles.memoryCardContainer}>
        <Animated.View style={[styles.memoryCardFront, { transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }] }]}>
          <Text style={{fontSize: width * 0.06}}>❓</Text> 
        </Animated.View>
        <Animated.View style={[styles.memoryCardBack, { transform: [{ perspective: 1000 }, { rotateY: backInterpolate }] }, item.isMatched && {borderColor: '#4CAF50', borderWidth: 3}]}>
          <Text style={styles.elifbaArText}>{item.ar}</Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

interface Scores {
  1: number;
  2: number;
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [lang, setLang] = useState<keyof typeof translations>('tr'); 
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'zikirmatik' | 'quran' | 'budget' | 'tools'>('home');
  const [activeSlide, setActiveSlide] = useState(0);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoContent, setInfoContent] = useState({ title: '', text: '' });
  const [sidePanelVisible, setSidePanelVisible] = useState(false);
  
  const [compassHeading, setCompassHeading] = useState(0); 
  const slideAnim = useRef(new Animated.Value(width)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  const lastHeading = useRef(0);
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const qiblaRotation = '137.5deg'; 

  const stars = useMemo(() => Array.from({ length: 45 }).map((_, i) => ({
    id: i, size: Math.random() * 3 + 1, top: Math.random() * height, left: Math.random() * width, delay: Math.random() * 3000,
  })), []);

  const [liveTimings, setLiveTimings] = useState({
    Imsak: '05:48', Sunrise: '07:13', Dhuhr: '13:21', Asr: '16:36', Maghrib: '19:18', Isha: '20:38'
  });
  const [nextPrayerName, setNextPrayerName] = useState('İmsak');
  const notifAnim = useRef(new Animated.Value(-150)).current; 
  const [notifTitle, setNotifTitle] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const kbShow = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const kbHide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { kbShow.remove(); kbHide.remove(); };
  }, []);

  const [showEducationModal, setShowEducationModal] = useState(false);
  const [showElifbaModal, setShowElifbaModal] = useState(false);
  const [elifbaSoundEnabled, setElifbaSoundEnabled] = useState(true);
  const [activeElifbaTab, setActiveElifbaTab] = useState<'ogrenim' | 'oyun'>('ogrenim');

  // --- HAFIZA OYUNU STATE LERİ ---
  const [gameMode, setGameMode] = useState<'menu' | 'single' | 'multi'>('menu');
  const [deck, setDeck] = useState<any[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [playerTurn, setPlayerTurn] = useState<1 | 2>(1);
  const [scores, setScores] = useState<Scores>({ 1: 0, 2: 0 });
  const [moves, setMoves] = useState(0);

  const initGame = (mode: 'single' | 'multi') => {
    let newDeck = [...gameLetters, ...gameLetters].map((letter) => ({
      uniqueId: Math.random().toString(),
      id: letter.id,
      ar: letter.ar,
      isFlipped: false,
      isMatched: false,
    }));
    newDeck = newDeck.sort(() => Math.random() - 0.5);
    setDeck(newDeck);
    setGameMode(mode);
    setScores({ 1: 0, 2: 0 });
    setMoves(0);
    setPlayerTurn(1);
    setFlippedIndices([]);
  };

  const handleMemoryCardPress = (index: number) => {
    if (flippedIndices.length >= 2 || deck[index].isFlipped || deck[index].isMatched) return;

    const newDeck = [...deck];
    newDeck[index].isFlipped = true;
    setDeck(newDeck);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(moves + 1);
      const [firstIdx, secondIdx] = newFlipped;
      
      if (newDeck[firstIdx].id === newDeck[secondIdx].id) {
        setTimeout(() => {
          const matchedDeck = [...deck];
          matchedDeck[firstIdx].isMatched = true;
          matchedDeck[secondIdx].isMatched = true;
          setDeck(matchedDeck);
          setScores((s: any) => ({ ...s, [playerTurn]: s[playerTurn] + 10 }));
          setFlippedIndices([]);
        }, 500);
      } else {
        setTimeout(() => {
          const resetDeck = [...deck];
          resetDeck[firstIdx].isFlipped = false;
          resetDeck[secondIdx].isFlipped = false;
          setDeck(resetDeck);
          setFlippedIndices([]);
          if (gameMode === 'multi') {
            setPlayerTurn(prev => prev === 1 ? 2 : 1);
          }
        }, 1000);
      }
    }
  };

  const checkGameEnd = () => deck.length > 0 && deck.every(card => card.isMatched);

  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [showDiniGunlerModal, setShowDiniGunlerModal] = useState(false);
  const [showHicriModal, setShowHicriModal] = useState(false);
  const [showMaarifModal, setShowMaarifModal] = useState(false);
  const [showKazaModal, setShowKazaModal] = useState(false);
  const [showItikafModal, setShowItikafModal] = useState(false);
  const [showCumaModal, setShowCumaModal] = useState(false);
  const [showZekatModal, setShowZekatModal] = useState(false);
  const [showKurbanModal, setShowKurbanModal] = useState(false);
  const [showHacModal, setShowHacModal] = useState(false);
  const [showCamilerModal, setShowCamilerModal] = useState(false);
  const [showEsmaModal, setShowEsmaModal] = useState(false);
  const [showNamazModal, setShowNamazModal] = useState(false);
  const [showAbdestModal, setShowAbdestModal] = useState(false);
  const [showGusulModal, setShowGusulModal] = useState(false);
  const [showTeyemmumModal, setShowTeyemmumModal] = useState(false);
  const [isBudgetSetup, setIsBudgetSetup] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [fixedExpense, setFixedExpense] = useState('');
  const [dailySpent, setDailySpent] = useState(0);
  const [expenseInput, setExpenseInput] = useState('');
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [notebookText, setNotebookText] = useState('');
  const [kazaList, setKazaList] = useState({ sabah: 0, ogle: 0, ikindi: 0, aksam: 0, yatsi: 0, vitir: 0 });
  const [zekatNakit, setZekatNakit] = useState('');
  const [zekatAltin, setZekatAltin] = useState('');
  const [zekatAlacak, setZekatAlacak] = useState('');
  const [zekatBorc, setZekatBorc] = useState('');

  const t = translations[lang as keyof typeof translations] || translations['tr'];

  const prayerDatesArray = [
    { name: t.imsak, stringTime: liveTimings.Imsak }, { name: t.sun, stringTime: liveTimings.Sunrise },
    { name: t.dhuhr, stringTime: liveTimings.Dhuhr }, { name: t.asr, stringTime: liveTimings.Asr },
    { name: t.maghrib, stringTime: liveTimings.Maghrib }, { name: t.isha, stringTime: liveTimings.Isha },
  ];

  // --- ARKA PLAN EZAN SİSTEMİ (NOTIFEE) ---
  const scheduleAlarms = async (timings: any) => {
    if (!notificationsEnabled) {
      await notifee.cancelAllNotifications();
      return;
    }

    await notifee.requestPermission();
    await notifee.cancelAllNotifications();

    const channelId = await notifee.createChannel({
      id: 'adhan_channel_offline',
      name: 'Ezan Vakti',
      sound: 'ezan', // Burası böyle kalacak
      importance: AndroidImportance.HIGH,
    });

    const times = [
      { name: 'İmsak', timeKey: 'Imsak' },
      { name: 'Öğle', timeKey: 'Dhuhr' },
      { name: 'İkindi', timeKey: 'Asr' },
      { name: 'Akşam', timeKey: 'Maghrib' },
      { name: 'Yatsı', timeKey: 'Isha' }
    ];

    for (const p of times) {
      const [hours, minutes] = timings[p.timeKey].split(':').map(Number);
      const now = new Date();
      let pDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

      if (pDate.getTime() <= now.getTime()) {
        pDate.setDate(pDate.getDate() + 1);
      }

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: pDate.getTime(),
        alarmManager: { allowWhileIdle: true },
      };

      await notifee.createTriggerNotification(
        {
          id: p.timeKey,
          title: `🕌 ${p.name} Vakti Geldi`,
          body: 'Ezan okunuyor...',
          android: {
            channelId,
            sound: 'ezan',
            importance: AndroidImportance.HIGH,
            pressAction: { id: 'default' },
            category: AndroidCategory.ALARM, // Android'e bunun normal bildirim değil, ALARM olduğunu söyler
            visibility: AndroidVisibility.PUBLIC, // Kilit ekranında görünmesini sağlar
          },
        },
        trigger,
      );
    }
  };

  useEffect(() => {
    const fetchTimings = async () => {
      try {
        const response = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Istanbul&country=Turkey&method=13');
        const json = await response.json();
        if (json?.data?.timings) {
          const fetchedTimings = {
            Imsak: json.data.timings.Imsak, Sunrise: json.data.timings.Sunrise,
            Dhuhr: json.data.timings.Dhuhr, Asr: json.data.timings.Asr,
            Maghrib: json.data.timings.Maghrib, Isha: json.data.timings.Isha
          };
          setLiveTimings(fetchedTimings);
          scheduleAlarms(json.data.timings);
        }
      } catch(e) { console.log("API Hatası:", e); }
    };
    fetchTimings();
  }, [notificationsEnabled]);

 const handlePrayerTimeTrigger = (prayerName: string) => {
    if(!notificationsEnabled) return; 

    setNotifTitle(`${t.prayerTimeArrived || 'Vakti Geldi'} (${prayerName})`);
    Animated.spring(notifAnim, { toValue: 50, useNativeDriver: true }).start();

    try {
      // İNTERNET YOK! Direkt içine gömdüğümüz dosyayı çalıştırır.
      const adhanSound = new Sound('ezan.mp3', Sound.MAIN_BUNDLE, (error: any) => {
        if (!error) {
          adhanSound.play(() => { adhanSound.release(); });
        } else {
          console.log("Lokal ses çalma hatası:", error);
        }
      });
    } catch (e) {
      console.log("Ses sistemi hatası:", e);
    }

    setTimeout(() => {
      Animated.timing(notifAnim, { toValue: -150, duration: 500, useNativeDriver: true }).start();
    }, 20000);
  };

  const getDailyCumaMessages = () => {
    const today = new Date();
    const seed = today.getFullYear() + today.getMonth() + today.getDate();
    const n = cumaMesajlariListesi.length;
    return [ cumaMesajlariListesi[seed % n], cumaMesajlariListesi[(seed + 1) % n], cumaMesajlariListesi[(seed + 2) % n] ];
  };
  const dailyMessages = getDailyCumaMessages();

  const shareMessage = async (msg: string) => {
    try { await Share.share({ message: msg }); } catch (error: any) { console.log("Paylaşım hatası:", error.message); }
  };

  const openMapsForMosques = () => {
    Linking.openURL('https://www.google.com/maps/search/cami').catch(err => console.error("Harita açılamadı:", err));
  };

  const calculateZekat = () => {
    const netServet = (parseFloat(zekatNakit) || 0) + (parseFloat(zekatAltin) || 0) + (parseFloat(zekatAlacak) || 0) - (parseFloat(zekatBorc) || 0);
    return netServet > 0 ? (netServet / 40).toFixed(2) : "0.00";
  };

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const savedIncome = await AsyncStorage.getItem('@monthlyIncome');
        const savedExpense = await AsyncStorage.getItem('@fixedExpense');
        const savedSpent = await AsyncStorage.getItem('@dailySpent');
        const savedDate = await AsyncStorage.getItem('@lastSavedDate');
        const savedNotes = await AsyncStorage.getItem('@budgetNotes');
        const savedKaza = await AsyncStorage.getItem('@kazaNamazi');
        const today = new Date().toDateString();

        if (savedIncome && savedExpense) { setMonthlyIncome(savedIncome); setFixedExpense(savedExpense); setIsBudgetSetup(true); }
        if (savedDate === today && savedSpent) { setDailySpent(parseFloat(savedSpent)); }
        else { setDailySpent(0); await AsyncStorage.setItem('@dailySpent', '0'); await AsyncStorage.setItem('@lastSavedDate', today); }
        if (savedNotes) { setNotebookText(savedNotes); }
        if (savedKaza) { setKazaList(JSON.parse(savedKaza)); }
      } catch (e) { console.log('Veri yüklenemedi:', e); }
    };
    loadAllData();
  }, []);

  const [zikirList, setZikirList] = useState([
    { id: '1', text: t.d1, count: 0 }, { id: '2', text: t.d2, count: 0 },
    { id: '3', text: t.d3, count: 0 }, { id: '4', text: t.d4, count: 0 },
  ]);
  const [activeZikirId, setActiveZikirId] = useState('1');
  const [dropdownVisible, setDropdownVisible] = useState(false); 
  const [newZikirText, setNewZikirText] = useState('');
  const [quranDropdownVisible, setQuranDropdownVisible] = useState(false);
  const [currentSurahIdx, setCurrentSurahIdx] = useState(0);

  // --- PROFESYONEL SES MOTORU (ÇAKIŞMAYI ÖNLER) ---
  const [isPlaying, setIsPlaying] = useState(false); 
  const [playbackProgress, setPlaybackProgress] = useState(0); 
  const [durationSeconds, setDurationSeconds] = useState(0);   
  const [soundObj, setSoundObj] = useState<any>(null);
  const soundRef = useRef<any>(null);
  const playIdRef = useRef<number>(0);

  useEffect(() => {
    if (sidePanelVisible) {
      const degree_update_rate = 1; 
      CompassHeading.start(degree_update_rate, ({heading}: any) => {
        let diff = heading - (lastHeading.current % 360);
        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;
        let targetValue = lastHeading.current + diff;
        lastHeading.current = targetValue;

        Animated.spring(spinValue, {
          toValue: targetValue,
          friction: 4,     
          tension: 20,     
          useNativeDriver: true
        }).start();

        setCompassHeading(heading);
      });

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true })
        ])
      ).start();

    } else {
      CompassHeading.stop(); 
      glowAnim.setValue(0.3);
    }
    return () => { CompassHeading.stop(); };
  }, [sidePanelVisible]);

  const smoothCompassRotation = spinValue.interpolate({
    inputRange: compassInputRange,
    outputRange: compassOutputRange
  });

  useEffect(() => { 
    return () => { if (soundRef.current) soundRef.current.release(); }; 
  }, []);

  useEffect(() => {
    let interval: any;
    if (isPlaying && soundObj) {
      interval = setInterval(() => { 
        if (soundRef.current) {
          soundRef.current.getCurrentTime((seconds: number) => { 
            if (seconds >= 0) setPlaybackProgress(seconds); 
          }); 
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, soundObj]);

  const loadAndPlaySound = (index: number) => {
    if (soundRef.current) { 
      soundRef.current.stop(); 
      soundRef.current.release(); 
      soundRef.current = null; 
    }
    
    playIdRef.current += 1;
    const currentPlayId = playIdRef.current;

    setIsPlaying(true); 
    setPlaybackProgress(0); 
    setDurationSeconds(0);
    
    const surahNumber = (index + 1).toString().padStart(3, '0');
    const secureUrl = `https://server8.mp3quran.net/afs/${surahNumber}.mp3`;
    
    const newSound = new Sound(secureUrl, undefined, (error: any) => {
      if (currentPlayId !== playIdRef.current) {
        newSound.release();
        return;
      }

      if (error) { setIsPlaying(false); return; }
      
      setDurationSeconds(newSound.getDuration());
      newSound.play((success: boolean) => { 
        if (currentPlayId === playIdRef.current) {
          setIsPlaying(false); 
          if(success) setPlaybackProgress(0); 
        }
      });
    });
    
    soundRef.current = newSound;
    setSoundObj(newSound);
  };

  const togglePlayPause = () => {
    if (soundRef.current) {
      if (isPlaying) { 
        soundRef.current.pause(); 
        setIsPlaying(false); 
      } else { 
        setIsPlaying(true); 
        soundRef.current.play((success: boolean) => { 
          setIsPlaying(false); 
          if(success) setPlaybackProgress(0); 
        }); 
      }
    } else { 
      loadAndPlaySound(currentSurahIdx); 
    }
  };

  const handleNextSurah = () => { const nextIdx = (currentSurahIdx + 1) % quranList.length; setCurrentSurahIdx(nextIdx); loadAndPlaySound(nextIdx); };
  const handlePrevSurah = () => { const prevIdx = (currentSurahIdx - 1 + quranList.length) % quranList.length; setCurrentSurahIdx(prevIdx); loadAndPlaySound(prevIdx); };
  const handleSelectSurah = (idx: number) => { setCurrentSurahIdx(idx); setQuranDropdownVisible(false); loadAndPlaySound(idx); };

  useEffect(() => {
    Animated.timing(slideAnim, { toValue: sidePanelVisible ? 0 : width, duration: 350, useNativeDriver: true }).start();
  }, [sidePanelVisible, slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 30,
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dx < -30) setSidePanelVisible(true);
        else if (gestureState.dx > 30) setSidePanelVisible(false);
      }
    })
  ).current;

  const handleScroll = (event: any) => {
    const slideSize = width * 0.85 + 20; 
    setActiveSlide(Math.round(event.nativeEvent.contentOffset.x / slideSize));
  };

  const handleElifbaScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / PAGE_WIDTH);
    setActiveElifbaTab(slideIndex === 0 ? 'ogrenim' : 'oyun');
  };

  const elifbaScrollViewRef = useRef<ScrollView>(null);

  const openInfoModal = (type: 'bio' | 'esma' | 'budget' | 'elifba') => {
    if (type === 'bio') setInfoContent({ title: t.biorhythm, text: t.bioInfo });
    else if (type === 'esma') setInfoContent({ title: t.esma, text: t.esmaInfo });
    else if (type === 'budget') setInfoContent({ title: t.budgetTitle, text: t.budgetInfoText });
    else if (type === 'elifba') setInfoContent({ title: t.elifbaTitle || 'Elifba & Oyun', text: t.elifbaInfo });
    setInfoModalVisible(true);
  };

  const handleTapZikir = () => setZikirList(prev => prev.map(z => z.id === activeZikirId ? { ...z, count: z.count + 1 } : z));
  const handleResetZikir = () => setZikirList(prev => prev.map(z => z.id === activeZikirId ? { ...z, count: 0 } : z));
  const handleAddZikir = () => {
    if (newZikirText.trim() !== '') {
      const newId = Date.now().toString();
      setZikirList([...zikirList, { id: newId, text: newZikirText, count: 0 }]);
      setActiveZikirId(newId); setNewZikirText(''); setDropdownVisible(false); 
    }
  };

  const calculateDailyBudget = () => {
    const income = parseFloat(monthlyIncome) || 0;
    const expense = parseFloat(fixedExpense) || 0;
    const remainingMonth = income - expense;
    const today = new Date();
    const remainingDays = Math.max(1, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate() + 1);
    return Math.floor((remainingMonth > 0 ? (remainingMonth / remainingDays) : 0) - dailySpent);
  };

  const handleSaveBudgetSetup = async () => {
    const inc = monthlyIncome || "0"; const exp = fixedExpense || "0";
    await AsyncStorage.setItem('@monthlyIncome', inc); await AsyncStorage.setItem('@fixedExpense', exp);
    setMonthlyIncome(inc); setFixedExpense(exp); setIsBudgetSetup(true); setShowBudgetModal(false);
  };

  const handleSpendMoney = async () => {
    const spent = parseFloat(expenseInput);
    if (spent > 0) {
      const newTotal = dailySpent + spent;
      setDailySpent(newTotal); setExpenseInput('');
      await AsyncStorage.setItem('@dailySpent', newTotal.toString());
    }
  };

  const handleResetDailySpend = async () => { setDailySpent(0); await AsyncStorage.setItem('@dailySpent', '0'); };
  const handleFullBudgetReset = async () => {
    setMonthlyIncome(''); setFixedExpense(''); setDailySpent(0); setIsBudgetSetup(false); setShowBudgetModal(false);
    await AsyncStorage.removeItem('@monthlyIncome'); await AsyncStorage.removeItem('@fixedExpense'); await AsyncStorage.setItem('@dailySpent', '0');
  };

  const handleSaveNotes = async (text: string) => { setNotebookText(text); await AsyncStorage.setItem('@budgetNotes', text); };

  const updateKaza = async (key: keyof typeof kazaList, increment: boolean) => {
    const newKazaList = { ...kazaList, [key]: Math.max(0, kazaList[key] + (increment ? 1 : -1)) };
    setKazaList(newKazaList); await AsyncStorage.setItem('@kazaNamazi', JSON.stringify(newKazaList));
  };

  const activeZikir = zikirList.find(z => z.id === activeZikirId);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return "00:00";
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  };

  const RenderKazaRow = ({ title, kazaKey }: { title: string, kazaKey: keyof typeof kazaList }) => (
    <View style={styles.kazaRowContainer}>
      <Text style={styles.kazaRowTitle}>{title}</Text>
      <View style={styles.kazaRowControls}>
        <TouchableOpacity style={styles.kazaMinusBtn} activeOpacity={0.6} onPress={() => updateKaza(kazaKey, false)}>
          <Text style={styles.kazaBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.kazaCountText}>{kazaList[kazaKey]}</Text>
        <TouchableOpacity style={styles.kazaPlusBtn} activeOpacity={0.6} onPress={() => updateKaza(kazaKey, true)}>
          <Text style={styles.kazaBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(splashTimer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050812" />
      
      {stars.map((star: any) => <Star key={star.id} {...star} />)}

      <Animated.View style={[styles.notificationBanner, { transform: [{ translateY: notifAnim }] }]}>
        <Text style={styles.notificationIcon}>🕌</Text>
        <View>
          <Text style={styles.notificationTitle}>{notifTitle}</Text>
          <Text style={styles.notificationText}>{t.adhanPlaying}</Text>
        </View>
      </Animated.View>

      {showSplash ? (
        <TouchableOpacity activeOpacity={1} style={styles.splashContent} onPress={() => setShowSplash(false)}>
          <Text style={styles.splashTitle}>MİHVER</Text>
          <Text style={styles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
          <Text style={styles.splashHint}>(Ekran takılırsa lütfen ekrana dokunun)</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.mainWrapper}>

          {activeTab === 'home' && (
            <Animated.View style={[styles.sidePanelContainer, { transform: [{ translateX: slideAnim }] }]} {...panResponder.panHandlers}>
              <View style={styles.sidePanelContent}>
                <View style={styles.sidePanelHeader}>
                  <TouchableOpacity style={styles.closeSidePanelButton} activeOpacity={0.6} onPress={() => setSidePanelVisible(false)}>
                    <Text style={styles.closeSidePanelText}>{"<"}</Text>
                  </TouchableOpacity>
                  <Text style={styles.qiblaTitle}>{t.qibla}</Text>
                  <View style={{width: 40}} />
                </View>

                <View style={styles.qiblaCompassContainer}>
                  <View style={styles.compassRingOuter}>
                    <View style={styles.compassRing}>
                      <Animated.View style={[styles.compassDisk, { transform: [{ rotate: smoothCompassRotation }] }]}>
                        <Text style={[styles.directionText, { top: 10, color: '#FF4444' }]}>{t.north}</Text>
                        <Text style={[styles.directionText, { bottom: 10 }]}>{t.south}</Text>
                        <Text style={[styles.directionText, { right: 15 }]}>{t.east}</Text>
                        <Text style={[styles.directionText, { left: 15 }]}>{t.west}</Text>
                        <View style={styles.northLine} />
                        <View style={[styles.qiblaArrowWrapper, { transform: [{ rotate: qiblaRotation }] }]}>
                          <Animated.View style={{ marginBottom: -5, opacity: glowAnim }}>
                            <KaabaIcon />
                          </Animated.View>
                          <View style={styles.qiblaDashedLine} />
                        </View>
                        {[...Array(24)].map((_, i) => (
                          <View key={i} style={[styles.compassDegreeLine, { transform: [{ rotate: `${i * 15}deg` }, { translateY: -130 }] }]} />
                        ))}
                      </Animated.View>
                    </View>
                  </View>
                  
                  <View style={styles.qiblaInfoBox}>
                    <Text style={styles.qiblaInfoLabel}>{t.qiblaAngle}</Text>
                    <Text style={styles.qiblaInfoValue}>{Math.round(compassHeading)}°</Text> 
                    <Text style={styles.qiblaSubText}>İstanbul, Türkiye (Hedef: 137.5°)</Text>
                  </View>

                  <Text style={styles.calibrationThinRedText}>
                    {t.calibrate}
                  </Text>

                </View>
              </View>
            </Animated.View>
          )}

          {activeTab === 'home' && (
            <View style={styles.screenView}>
              <View style={styles.header}>
                <TouchableOpacity style={styles.kibleTopButton} activeOpacity={0.6} onPress={() => setSidePanelVisible(true)}>
                  <Text style={styles.kibleTopButtonText} adjustsFontSizeToFit numberOfLines={1}>🕋 {t.kibleBtn}</Text>
                </TouchableOpacity>
                <View style={styles.headerRightControls}>
                  <TouchableOpacity style={styles.settingsButton} activeOpacity={0.6} onPress={() => setShowSettings(true)}>
                    <Text style={styles.settingsIcon}>⚙️</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.homeContentWrapper}>
                <PrayerTimer liveTimings={liveTimings} t={t} onPrayerTime={handlePrayerTimeTrigger} onNextPrayerChange={setNextPrayerName} />
                <View style={styles.carouselSection}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={width * 0.85 + 20} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: (width - (width * 0.85)) / 2 }} onScroll={handleScroll} scrollEventThrottle={16}>
                    <View style={styles.card}>
                      <View style={styles.cardHeader}><Text style={styles.cardTitle}>{t.prayerTimesTitle || 'VAKİTLER'}</Text></View>
                      <View style={styles.prayerList}>
                        {prayerDatesArray.map((p: any, index: number) => (
                          <View key={index} style={[styles.prayerRow, nextPrayerName === p.name && styles.activePrayerRow]}>
                            <Text style={[styles.prayerName, nextPrayerName === p.name && styles.activePrayerText]}>{p.name}</Text>
                            <Text style={[styles.prayerTime, nextPrayerName === p.name && styles.activePrayerText]}>{p.stringTime}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <View style={styles.card}>
                      <View style={styles.cardHeader}><Text style={styles.cardTitle}>{t.biorhythm.toUpperCase()}</Text><TouchableOpacity style={styles.infoButton} activeOpacity={0.6} onPress={() => openInfoModal('bio')}><Text style={styles.infoIcon}>i</Text></TouchableOpacity></View>
                      <View style={styles.biorhythmContent}>
                        <View style={styles.bioRow}><Text style={styles.bioLabel}>{t.physical}</Text><View style={styles.bioBarBg}><View style={[styles.bioBarFill, { width: '85%', backgroundColor: '#E0E6ED' }]} /></View><Text style={styles.bioPercent}>%85</Text></View>
                        <View style={styles.bioRow}><Text style={styles.bioLabel}>{t.emotional}</Text><View style={styles.bioBarBg}><View style={[styles.bioBarFill, { width: '60%', backgroundColor: '#A0AAB5' }]} /></View><Text style={styles.bioPercent}>%60</Text></View>
                        <View style={styles.bioRow}><Text style={styles.bioLabel}>{t.intellectual}</Text><View style={styles.bioBarBg}><View style={[styles.bioBarFill, { width: '92%', backgroundColor: '#FFFFFF' }]} /></View><Text style={styles.bioPercent}>%92</Text></View>
                      </View>
                    </View>
                    <View style={styles.card}>
                      <View style={styles.cardHeader}><Text style={styles.cardTitle}>{t.esma.toUpperCase()}</Text><TouchableOpacity style={styles.infoButton} activeOpacity={0.6} onPress={() => openInfoModal('esma')}><Text style={styles.infoIcon}>i</Text></TouchableOpacity></View>
                      <View style={styles.esmaContent}><Text style={styles.esmaName}>El-Vedûd</Text><Text style={styles.esmaDesc}>{t.esmaInfo}</Text></View>
                    </View>
                  </ScrollView>
                  <View style={styles.paginationContainer}>
                    {[0, 1, 2].map((_, idx) => (<View key={idx} style={[styles.dot, activeSlide === idx && styles.activeDot]} />))}
                  </View>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'zikirmatik' && (
            <View style={styles.screenView}>
              <View style={styles.zikirHeader}>
                <View style={{ width: 30 }} /> 
                <Text style={styles.zikirHeaderTitle}>{t.zikirmatik}</Text>
                <View style={{ width: 30 }} />
              </View>
              <TouchableOpacity style={styles.dropdownSelector} activeOpacity={0.6} onPress={() => setDropdownVisible(true)}>
                <Text style={styles.dropdownSelectorText} numberOfLines={1} ellipsizeMode="tail">{activeZikir?.text}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              <View style={styles.zikirCenterArea}>
                <Text style={styles.zikirCounterNumber} numberOfLines={1} adjustsFontSizeToFit>{activeZikir?.count}</Text>
                <TouchableOpacity style={styles.modernZikirReset} activeOpacity={0.6} onPress={handleResetZikir}>
                  <Text style={styles.modernZikirResetText}>⟲ {t.reset}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.zikirTapArea}>
                <TouchableOpacity style={styles.zikirTapButton} activeOpacity={0.6} onPress={handleTapZikir}>
                  <View style={styles.zikirTapButtonInner}><Text style={styles.zikirTapText}>{t.tapToCount}</Text></View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 'quran' && (
            <View style={styles.screenView}>
              <View style={styles.zikirHeader}>
                <View style={{ width: 30 }} /> 
                <Text style={styles.zikirHeaderTitle}>{t.quran}</Text>
                <View style={{ width: 30 }} />
              </View>
              <TouchableOpacity style={styles.dropdownSelector} activeOpacity={0.6} onPress={() => setQuranDropdownVisible(true)}>
                <Text style={styles.dropdownSelectorText} numberOfLines={1} ellipsizeMode="tail">{quranList[currentSurahIdx].name}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              <View style={styles.quranCenterArea}>
                <View style={styles.albumArtContainer}><View style={styles.albumArtInner}><Text style={styles.albumArtIcon}>📖</Text></View></View>
                <Text style={styles.quranTitleText} adjustsFontSizeToFit numberOfLines={1}>{quranList[currentSurahIdx].name}</Text>
                <Text style={styles.quranSubtitleText}>{quranList[currentSurahIdx].reciter}</Text>
                <View style={styles.progressContainer}>
                  



                  <TouchableOpacity 
  activeOpacity={0.9} 
  style={{ paddingVertical: 10, width: '100%', justifyContent: 'center' }} 
  onPress={(e) => {
    if (durationSeconds > 0 && soundRef.current) {
      const barWidth = width * 0.84; // Çubuğun ekrandaki toplam genişliği
      const seekTime = (e.nativeEvent.locationX / barWidth) * durationSeconds;
      soundRef.current.setCurrentTime(seekTime);
      setPlaybackProgress(seekTime);
    }
  }}
>
  <View style={styles.progressBarBg} pointerEvents="none">
    <View style={[styles.progressBarFill, { width: `${durationSeconds > 0 ? (playbackProgress / durationSeconds) * 100 : 0}%` }]} />
  </View>
</TouchableOpacity>
                  



                  
                  <View style={styles.progressTimeRow}><Text style={styles.progressTimeText}>{formatTime(playbackProgress)}</Text><Text style={styles.progressTimeText}>{formatTime(durationSeconds)}</Text></View>
                </View>
                <View style={styles.playerControlsRow}>
                  <TouchableOpacity style={styles.controlButtonSmall} activeOpacity={0.6} onPress={handlePrevSurah}><PrevIcon /></TouchableOpacity>
                  <TouchableOpacity style={styles.controlButtonLarge} onPress={togglePlayPause} activeOpacity={0.6}>{isPlaying ? <PauseIcon /> : <PlayIcon />}</TouchableOpacity>
                  <TouchableOpacity style={styles.controlButtonSmall} activeOpacity={0.6} onPress={handleNextSurah}><NextIcon /></TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'budget' && (
            <View style={styles.screenView}>
              <View style={styles.budgetHeaderOverlay}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}><Text style={styles.budgetHeaderTitle}>{t.budgetTitle}</Text><TouchableOpacity style={[styles.infoButton, { marginLeft: 10, width: 22, height: 22 }]} activeOpacity={0.6} onPress={() => openInfoModal('budget')}><Text style={styles.infoIcon}>i</Text></TouchableOpacity></View>
                <Text style={styles.budgetHeaderSub}>{t.budgetSubtitle}</Text>
              </View>
              {!isBudgetSetup ? (
                <View style={styles.budgetSetupContainer}>
                  <View style={styles.budgetSetupBox}>
                    <Text style={styles.setupIcon}>⚙️</Text><Text style={styles.setupTitle}>{t.budgetSetupTitle}</Text><Text style={styles.setupDesc}>{t.budgetSetupDesc}</Text>
                    <TouchableOpacity style={styles.setupButton} activeOpacity={0.6} onPress={() => setShowBudgetModal(true)}><Text style={styles.setupButtonText}>{t.startBtn}</Text></TouchableOpacity>
                  </View>
                </View>
              ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
                  <View style={styles.budgetMainCard}>
                    <View style={styles.budgetCircleOuter}><View style={[styles.budgetCircleInner, { borderColor: calculateDailyBudget() >= 0 ? '#FFFFFF' : '#FF4444' }]}><Text style={styles.budgetAmountText} adjustsFontSizeToFit numberOfLines={1}>{calculateDailyBudget()} ₺</Text></View></View>
                    <Text style={styles.budgetSparkleText}>{t.sparkleText}</Text>
                  </View>
                  <View style={styles.fastExpenseCard}>
                    <Text style={styles.fastExpenseTitle}>{t.fastExpense}</Text>
                    <TextInput style={styles.spendInputFull} placeholder={t.amount} placeholderTextColor="#A0AAB5" keyboardType="numeric" value={expenseInput} onChangeText={setExpenseInput} />
                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity style={styles.spendButtonHalf} activeOpacity={0.6} onPress={handleSpendMoney}><Text style={styles.spendButtonText}>{t.spentBtn}</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.resetButtonHalf} activeOpacity={0.6} onPress={handleResetDailySpend}><Text style={styles.resetButtonTextBtn}>⟲ {t.resetSpend}</Text></TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.openNotebookButton} activeOpacity={0.6} onPress={() => setShowNotebookModal(true)}><Text style={styles.openNotebookText}>{t.openNotebook}</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.budgetSettingsRow} activeOpacity={0.6} onPress={() => setShowBudgetModal(true)}><Text style={styles.budgetSettingsText}>⚙️ {t.changeSettingsTitle}</Text><Text style={styles.budgetSettingsLink}>{t.changeSettings}</Text></TouchableOpacity>
                </ScrollView>
              )}
            </View>
          )}

          {activeTab === 'tools' && (
            <View style={styles.screenView}>
              <View style={styles.budgetHeaderOverlay}><Text style={styles.budgetHeaderTitle}>{t.toolsTitle}</Text><Text style={styles.budgetHeaderSub}>{t.toolsSubtitle}</Text></View>
              <ScrollView contentContainerStyle={{ padding: width * 0.05, paddingBottom: 50 }}>
                <TouchableOpacity style={styles.nostalgicCard} onPress={() => setShowEducationModal(true)} activeOpacity={0.6}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={styles.nostalgicCardTitle}>{t.tools || 'EĞİTİMLER'}</Text><Text style={{ fontSize: width * 0.06 }}>📚</Text></View></TouchableOpacity>
                <TouchableOpacity style={styles.nostalgicCard} onPress={() => { setShowCalendarModal(true); }} activeOpacity={0.6}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={styles.nostalgicCardTitle}>TAKVİMLER</Text><Text style={{ fontSize: width * 0.06 }}>📅</Text></View></TouchableOpacity>
                <TouchableOpacity style={styles.nostalgicCard} onPress={() => { setTimeout(() => setShowRequirementsModal(true), 300); }} activeOpacity={0.6}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={styles.nostalgicCardTitle}>İHTİYAÇLAR</Text><Text style={{ fontSize: width * 0.06 }}>⚖️</Text></View></TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* TAB BAR ARTIK ABSOLUTE DEĞİL, UYGULAMANIN EN ALTINA OTURUYOR */}
          <View style={styles.bottomTabBar}>
            <TouchableOpacity style={styles.tabItem} activeOpacity={0.6} onPress={() => setActiveTab('home')}><Text style={[styles.tabIcon, activeTab === 'home' && styles.activeTabIcon]}>🏠</Text><Text style={[styles.tabText, activeTab === 'home' && styles.activeTabText]}>{t.home}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} activeOpacity={0.6} onPress={() => setActiveTab('zikirmatik')}><Text style={[styles.tabIcon, activeTab === 'zikirmatik' && styles.activeTabIcon]}>📿</Text><Text style={[styles.tabText, activeTab === 'zikirmatik' && styles.activeTabText]}>{t.zikirmatik}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} activeOpacity={0.6} onPress={() => setActiveTab('quran')}><Text style={[styles.tabIcon, activeTab === 'quran' && styles.activeTabIcon]}>📖</Text><Text style={[styles.tabText, activeTab === 'quran' && styles.activeTabText]}>{t.quran}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} activeOpacity={0.6} onPress={() => setActiveTab('budget')}><MoneyBagIcon active={activeTab === 'budget'} /><Text style={[styles.tabText, activeTab === 'budget' && styles.activeTabText]}>{t.budget}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} activeOpacity={0.6} onPress={() => setActiveTab('tools')}><Text style={[styles.tabIcon, activeTab === 'tools' && styles.activeTabIcon]}>📚</Text><Text style={[styles.tabText, activeTab === 'tools' && styles.activeTabText]}>{t.tools}</Text></TouchableOpacity>
          </View>

        </View>
      )}

      {/* MODALLAR */}
      <Modal visible={showElifbaModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.nostalgicModalContainer, { width: '95%', maxHeight: '90%', padding: 0 }]}>
            
            <View style={[styles.nostalgicModalHeader, { paddingHorizontal: 20, paddingTop: 20, marginBottom: 10 }]}>
              <TouchableOpacity style={{ width: 40 }} activeOpacity={0.6} onPress={() => { setShowElifbaModal(false); setTimeout(() => setShowEducationModal(true), 300); }}>
                <Text style={styles.nostalgicBackArrow}>{"<"}</Text>
              </TouchableOpacity>
              <Text style={[styles.nostalgicModalTitle, { flex: 1, textAlign: 'center', fontSize: width * 0.045 }]} adjustsFontSizeToFit numberOfLines={1}>{t.elifbaTitle || 'Elifba & Oyun'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', width: 70, justifyContent: 'space-between' }}>
                <TouchableOpacity activeOpacity={0.6} onPress={() => setElifbaSoundEnabled(!elifbaSoundEnabled)}><Text style={{ fontSize: width * 0.055 }}>{elifbaSoundEnabled ? '🔊' : '🔇'}</Text></TouchableOpacity>
                <TouchableOpacity activeOpacity={0.6} onPress={() => openInfoModal('elifba')} style={styles.infoButtonNostaljik}><Text style={styles.infoIconNostaljik}>i</Text></TouchableOpacity>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 15 }}>
              <TouchableOpacity onPress={() => elifbaScrollViewRef.current?.scrollTo({x: 0, animated: true})}><Text style={[styles.tabLabel, activeElifbaTab === 'ogrenim' && styles.activeTabLabel]}>📖 Öğrenim</Text></TouchableOpacity>
              <Text style={{ color: '#D4C4A8', marginHorizontal: 15 }}>|</Text>
              <TouchableOpacity onPress={() => elifbaScrollViewRef.current?.scrollTo({x: PAGE_WIDTH, animated: true})}><Text style={[styles.tabLabel, activeElifbaTab === 'oyun' && styles.activeTabLabel]}>🎮 Oyun Modu</Text></TouchableOpacity>
            </View>

            <ScrollView ref={elifbaScrollViewRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={handleElifbaScroll} scrollEventThrottle={16}>
              <View style={{ width: PAGE_WIDTH, alignItems: 'center' }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {elifbaList.map((item) => (<ElifbaCard key={item.id} item={item} soundEnabled={elifbaSoundEnabled} />))}
                  </View>
                </ScrollView>
              </View>

              <View style={{ width: PAGE_WIDTH, alignItems: 'center', paddingHorizontal: 10 }}>
                {gameMode === 'menu' ? (
                  <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%'}}>
                    <Text style={{color: '#3E2723', fontSize: width * 0.06, fontWeight: 'bold', fontStyle: 'italic', marginBottom: height * 0.04}}>Hafıza Oyunu</Text>
                    <TouchableOpacity style={styles.gameMenuButton} onPress={() => initGame('single')} activeOpacity={0.7}><Text style={styles.gameMenuButtonText}>👤 Tek Kişilik Oyna</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.gameMenuButton} onPress={() => initGame('multi')} activeOpacity={0.7}><Text style={styles.gameMenuButtonText}>👥 İki Kişilik Oyna</Text></TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView style={{flex: 1, width: '100%'}} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                    <View style={styles.scoreBoard}>
                      {gameMode === 'single' ? (
                        <Text style={styles.scoreText}>Puan: {scores[1]} | Hamle: {moves}</Text>
                      ) : (
                        <>
                          <Text style={[styles.scoreText, playerTurn === 1 && styles.activePlayerScore]}>Oyuncu 1: {scores[1]}</Text>
                          <Text style={[styles.scoreText, playerTurn === 2 && styles.activePlayerScore]}>Oyuncu 2: {scores[2]}</Text>
                        </>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 }}>
                      {deck.map((card, index) => (<MemoryCard key={card.uniqueId} item={card} onPress={() => handleMemoryCardPress(index)} />))}
                    </View>
                    {checkGameEnd() && (<Text style={styles.winText}>Tebrikler, Oyun Bitti!</Text>)}
                    <TouchableOpacity style={styles.restartGameButton} onPress={() => setGameMode('menu')} activeOpacity={0.7}><Text style={styles.restartGameButtonText}>Menüye Dön</Text></TouchableOpacity>
                  </ScrollView>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCalendarModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.nostalgicModalContainer}>
            <View style={styles.nostalgicModalHeader}>
              <Text style={styles.nostalgicModalTitle}>TAKVİMLER</Text>
              <TouchableOpacity activeOpacity={0.6} onPress={() => setShowCalendarModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.nostalgicList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.nostalgicItem} activeOpacity={0.6} onPress={() => { setShowCalendarModal(false); setTimeout(() => setShowHicriModal(true), 300); }}><Text style={styles.nostalgicItemTextHighlight}>🌙 Bugün (Hicri)</Text></TouchableOpacity>
              <TouchableOpacity style={styles.nostalgicItem} activeOpacity={0.6} onPress={() => { setShowCalendarModal(false); setTimeout(() => setShowMaarifModal(true), 300); }}><Text style={styles.nostalgicItemTextHighlight}>📅 Maarif Takvimi</Text></TouchableOpacity>
              <TouchableOpacity style={styles.nostalgicItem} activeOpacity={0.6} onPress={() => { setShowCalendarModal(false); setTimeout(() => setShowDiniGunlerModal(true), 300); }}><Text style={styles.nostalgicItemTextHighlight}>🕌 Dini Günler</Text></TouchableOpacity>
              <TouchableOpacity style={styles.nostalgicItem} activeOpacity={0.6} onPress={() => { setShowCalendarModal(false); setTimeout(() => setShowKazaModal(true), 300); }}><Text style={styles.nostalgicItemTextHighlight}>🤲 Kaza Takvimi</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showDiniGunlerModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.nostalgicModalContainer}>
            <View style={styles.nostalgicModalHeader}>
              <TouchableOpacity style={{ width: 40 }} activeOpacity={0.6} onPress={() => { setShowDiniGunlerModal(false); setTimeout(() => setShowCalendarModal(true), 300); }}><Text style={styles.nostalgicBackArrow}>{"<"}</Text></TouchableOpacity>
              <Text style={[styles.nostalgicModalTitle, { flex: 1, textAlign: 'center' }]} adjustsFontSizeToFit numberOfLines={1}>DİNİ GÜNLER</Text>
              <TouchableOpacity style={{ width: 40, alignItems: 'flex-end' }} activeOpacity={0.6} onPress={() => setShowDiniGunlerModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.nostalgicItem, {flexDirection: 'column', alignItems: 'flex-start'}]}><Text style={[styles.nostalgicItemTextHighlight, {marginBottom: 5}]}>Üç Aylar Başlangıcı:</Text><Text style={styles.nostalgicItemText}>19 Ocak 2026</Text></View>
              <View style={[styles.nostalgicItem, {flexDirection: 'column', alignItems: 'flex-start'}]}><Text style={[styles.nostalgicItemTextHighlight, {marginBottom: 5}]}>Regaib Kandili:</Text><Text style={styles.nostalgicItemText}>22 Ocak 2026</Text></View>
              <View style={[styles.nostalgicItem, {flexDirection: 'column', alignItems: 'flex-start'}]}><Text style={[styles.nostalgicItemTextHighlight, {marginBottom: 5}]}>Miraç Kandili:</Text><Text style={styles.nostalgicItemText}>13 Şubat 2026</Text></View>
              <View style={[styles.nostalgicItem, {flexDirection: 'column', alignItems: 'flex-start'}]}><Text style={[styles.nostalgicItemTextHighlight, {marginBottom: 5}]}>Berat Kandili:</Text><Text style={styles.nostalgicItemText}>3 Mart 2026</Text></View>
              <View style={[styles.nostalgicItem, {flexDirection: 'column', alignItems: 'flex-start'}]}><Text style={[styles.nostalgicItemTextHighlight, {marginBottom: 5}]}>Ramazan Başlangıcı:</Text><Text style={styles.nostalgicItemText}>19 Mart 2026</Text></View>
              <View style={[styles.nostalgicItem, {flexDirection: 'column', alignItems: 'flex-start'}]}><Text style={[styles.nostalgicItemTextHighlight, {marginBottom: 5}]}>Kadir Gecesi:</Text><Text style={styles.nostalgicItemText}>14 Nisan 2026</Text></View>
              <View style={[styles.nostalgicItem, {flexDirection: 'column', alignItems: 'flex-start'}]}><Text style={[styles.nostalgicItemTextHighlight, {marginBottom: 5}]}>Ramazan Bayramı:</Text><Text style={styles.nostalgicItemText}>18 Nisan 2026</Text></View>
              <View style={[styles.nostalgicItem, {flexDirection: 'column', alignItems: 'flex-start'}]}><Text style={[styles.nostalgicItemTextHighlight, {marginBottom: 5}]}>Kurban Bayramı:</Text><Text style={styles.nostalgicItemText}>25 Haziran 2026</Text></View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showHicriModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.nostalgicModalContainer}>
            <View style={styles.nostalgicModalHeader}>
              <TouchableOpacity style={{ width: 40 }} activeOpacity={0.6} onPress={() => { setShowHicriModal(false); setTimeout(() => setShowCalendarModal(true), 300); }}><Text style={styles.nostalgicBackArrow}>{"<"}</Text></TouchableOpacity>
              <Text style={[styles.nostalgicModalTitle, { flex: 1, textAlign: 'center' }]}>BUGÜN</Text>
              <TouchableOpacity style={{ width: 40, alignItems: 'flex-end' }} activeOpacity={0.6} onPress={() => setShowHicriModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{fontSize: 70, marginBottom: 20}}>🌙</Text>
              <Text style={[styles.nostalgicItemTextHighlight, {fontSize: width * 0.08, textAlign: 'center'}]} adjustsFontSizeToFit numberOfLines={1}>{getHicriDate()}</Text>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showMaarifModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.nostalgicModalContainer}>
            <View style={styles.nostalgicModalHeader}>
              <TouchableOpacity style={{ width: 40 }} activeOpacity={0.6} onPress={() => { setShowMaarifModal(false); setTimeout(() => setShowCalendarModal(true), 300); }}><Text style={styles.nostalgicBackArrow}>{"<"}</Text></TouchableOpacity>
              <Text style={[styles.nostalgicModalTitle, { flex: 1, textAlign: 'center' }]}>MAARİF TAKVİMİ</Text>
              <TouchableOpacity style={{ width: 40, alignItems: 'flex-end' }} activeOpacity={0.6} onPress={() => setShowMaarifModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <View style={{ backgroundColor: '#FFFDF0', padding: width * 0.05, borderRadius: 15, borderWidth: 2, borderColor: '#D4C4A8', alignItems: 'center' }}>
              <Text style={{color: '#3E2723', fontSize: width * 0.18, fontWeight: 'bold'}}>{new Date().getDate()}</Text>
              <Text style={{color: '#8B5A2B', fontSize: width * 0.05, fontWeight: 'bold', marginBottom: 5}}>{new Date().toLocaleDateString(t.localeCode, { month: 'long' })} {new Date().getFullYear()}</Text>
              <View style={{backgroundColor: '#D4C4A8', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 8, marginBottom: 15}}>
                 <Text style={{color: '#3E2723', fontSize: width * 0.035, fontStyle: 'italic'}}>Rumi: {getRumiDate().day} {getRumiDate().month} {getRumiDate().year}</Text>
              </View>
              <View style={{height: 2, width: '100%', backgroundColor: '#D4C4A8', marginBottom: 15}} />
              <Text style={{color: '#8B5A2B', fontSize: 12, fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase'}}>Günün Notu</Text>
              <Text style={{color: '#3E2723', fontSize: width * 0.035, fontStyle: 'italic', textAlign: 'center', lineHeight: 22}}>
                 {getMaarifNote()}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showKazaModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.nostalgicModalContainer}>
            <View style={styles.nostalgicModalHeader}>
              <TouchableOpacity style={{ width: 40 }} activeOpacity={0.6} onPress={() => { setShowKazaModal(false); setTimeout(() => setShowCalendarModal(true), 300); }}><Text style={styles.nostalgicBackArrow}>{"<"}</Text></TouchableOpacity>
              <Text style={[styles.nostalgicModalTitle, { flex: 1, textAlign: 'center' }]}>KAZA TAKVİMİ</Text>
              <TouchableOpacity style={{ width: 40, alignItems: 'flex-end' }} activeOpacity={0.6} onPress={() => setShowKazaModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <RenderKazaRow title="Sabah Namazı" kazaKey="sabah" />
              <RenderKazaRow title="Öğle Namazı" kazaKey="ogle" />
              <RenderKazaRow title="İkindi Namazı" kazaKey="ikindi" />
              <RenderKazaRow title="Akşam Namazı" kazaKey="aksam" />
              <RenderKazaRow title="Yatsı Namazı" kazaKey="yatsi" />
              <RenderKazaRow title="Vitir Namazı" kazaKey="vitir" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showEducationModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.nostalgicModalContainer}>
            <View style={styles.nostalgicModalHeader}>
              <Text style={styles.nostalgicModalTitle}>{t.toolsTitle || 'EĞİTİMLER'}</Text>
              <TouchableOpacity activeOpacity={0.6} onPress={() => setShowEducationModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.nostalgicList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.nostalgicItem} activeOpacity={0.6} onPress={() => { setShowEducationModal(false); setTimeout(() => setShowElifbaModal(true), 300); }}><Text style={styles.nostalgicItemTextHighlight}>{t.elifbaTitle || 'Elifba & Oyun'}</Text></TouchableOpacity>
              <View style={styles.nostalgicSeparator} />
              <TouchableOpacity style={styles.nostalgicItem} activeOpacity={0.6} onPress={() => { setShowEducationModal(false); setTimeout(() => setShowEsmaModal(true), 300); }}><Text style={styles.nostalgicItemText}>1 - Esmâ-ül Hüsnâ</Text></TouchableOpacity>
              <TouchableOpacity style={styles.nostalgicItem} activeOpacity={0.6} onPress={() => { setShowEducationModal(false); setTimeout(() => setShowNamazModal(true), 300); }}><Text style={styles.nostalgicItemText}>2 - Namaz Nasıl Kılınır?</Text></TouchableOpacity>
              <TouchableOpacity style={styles.nostalgicItem} activeOpacity={0.6} onPress={() => { setShowEducationModal(false); setTimeout(() => setShowAbdestModal(true), 300); }}><Text style={styles.nostalgicItemText}>3 - Abdest Nasıl Alınır?</Text></TouchableOpacity>
              <TouchableOpacity style={styles.nostalgicItem} activeOpacity={0.6} onPress={() => { setShowEducationModal(false); setTimeout(() => setShowGusulModal(true), 300); }}><Text style={styles.nostalgicItemText}>4 - Gusül Abdesti Nasıl Alınır?</Text></TouchableOpacity>
              <TouchableOpacity style={styles.nostalgicItem} activeOpacity={0.6} onPress={() => { setShowEducationModal(false); setTimeout(() => setShowTeyemmumModal(true), 300); }}><Text style={styles.nostalgicItemText}>5 - Teyemmüm Abdesti Nasıl Alınır?</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showEsmaModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.nostalgicModalContainer}>
            <View style={styles.nostalgicModalHeader}>
              <TouchableOpacity style={{ width: 40 }} activeOpacity={0.6} onPress={() => { setShowEsmaModal(false); setTimeout(() => setShowEducationModal(true), 300); }}><Text style={styles.nostalgicBackArrow}>{"<"}</Text></TouchableOpacity>
              <Text style={[styles.nostalgicModalTitle, { flex: 1, textAlign: 'center', fontSize: 18 }]}>ESMÂ-ÜL HÜSNÂ</Text>
              <TouchableOpacity style={{ width: 40, alignItems: 'flex-end' }} activeOpacity={0.6} onPress={() => setShowEsmaModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {esmaUlHusnaList.map((item) => (
                <View key={item.id} style={styles.esmaCard}><Text style={styles.esmaCardTitle}>{item.id}. {item.name}</Text><Text style={styles.esmaCardText}>{item.desc}</Text></View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showNamazModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.nostalgicModalContainer}>
            <View style={styles.nostalgicModalHeader}>
              <TouchableOpacity style={{ width: 40 }} activeOpacity={0.6} onPress={() => { setShowNamazModal(false); setTimeout(() => setShowEducationModal(true), 300); }}><Text style={styles.nostalgicBackArrow}>{"<"}</Text></TouchableOpacity>
              <Text style={[styles.nostalgicModalTitle, { flex: 1, textAlign: 'center', fontSize: 18 }]}>NAMAZ REHBERİ</Text>
              <TouchableOpacity style={{ width: 40, alignItems: 'flex-end' }} activeOpacity={0.6} onPress={() => setShowNamazModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {namazSteps.map((step) => (
                <View key={step.id} style={styles.guideTextCard}><Text style={styles.guideItemTitle}>{step.title}</Text><Text style={styles.guideItemDesc}>{step.desc}</Text></View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showAbdestModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.nostalgicModalContainer, { width: '95%', padding: 15 }]}>
            <View style={styles.nostalgicModalHeader}>
              <TouchableOpacity style={{ width: 40 }} activeOpacity={0.6} onPress={() => { setShowAbdestModal(false); setTimeout(() => setShowEducationModal(true), 300); }}><Text style={styles.nostalgicBackArrow}>{"<"}</Text></TouchableOpacity>
              <Text style={[styles.nostalgicModalTitle, { flex: 1, textAlign: 'center', fontSize: 18 }]}>ABDEST REHBERİ</Text>
              <TouchableOpacity style={{ width: 40, alignItems: 'flex-end' }} activeOpacity={0.6} onPress={() => setShowAbdestModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {abdestSteps.map((step) => (
                <Image key={step.id} source={step.img} style={styles.fullScreenImage} />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showGusulModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.nostalgicModalContainer, { width: '95%', padding: 15 }]}>
            <View style={styles.nostalgicModalHeader}>
              <TouchableOpacity style={{ width: 40 }} activeOpacity={0.6} onPress={() => { setShowGusulModal(false); setTimeout(() => setShowEducationModal(true), 300); }}><Text style={styles.nostalgicBackArrow}>{"<"}</Text></TouchableOpacity>
              <Text style={[styles.nostalgicModalTitle, { flex: 1, textAlign: 'center', fontSize: 18 }]}>GUSÜL REHBERİ</Text>
              <TouchableOpacity style={{ width: 40, alignItems: 'flex-end' }} activeOpacity={0.6} onPress={() => setShowGusulModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {gusulSteps.map((step) => (
                <Image key={step.id} source={step.img} style={styles.fullScreenImage} />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showTeyemmumModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.nostalgicModalContainer, { width: '95%', padding: 15 }]}>
            <View style={styles.nostalgicModalHeader}>
              <TouchableOpacity style={{ width: 40 }} activeOpacity={0.6} onPress={() => { setShowTeyemmumModal(false); setTimeout(() => setShowEducationModal(true), 300); }}><Text style={styles.nostalgicBackArrow}>{"<"}</Text></TouchableOpacity>
              <Text style={[styles.nostalgicModalTitle, { flex: 1, textAlign: 'center', fontSize: 18 }]}>TEYEMMÜM REHBERİ</Text>
              <TouchableOpacity style={{ width: 40, alignItems: 'flex-end' }} activeOpacity={0.6} onPress={() => setShowTeyemmumModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.nostalgicItemText, {textAlign: 'center', marginBottom: 15, fontSize: 12}]}>*Suyun bulunmadığı durumlarda temiz toprakla alınan abdest.*</Text>
              {teyemmumSteps.map((step) => (
                <Image key={step.id} source={step.img} style={styles.fullScreenImage} />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showRequirementsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.nostalgicModalContainer}>
            <View style={styles.nostalgicModalHeader}>
              <Text style={styles.nostalgicModalTitle}>İHTİYAÇLAR</Text>
              <TouchableOpacity activeOpacity={0.6} onPress={() => setShowRequirementsModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.nostalgicList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.nostalgicItem} activeOpacity={0.6} onPress={() => {setShowRequirementsModal(false); setTimeout(() => setShowItikafModal(true), 300);}}><Text style={styles.nostalgicItemTextHighlight}>Dijital İtikaf</Text></TouchableOpacity>
              <TouchableOpacity style={styles.nostalgicItem} activeOpacity={0.6} onPress={() => {setShowRequirementsModal(false); setTimeout(() => setShowCumaModal(true), 300);}}><Text style={styles.nostalgicItemTextHighlight}>Cuma Mesajları</Text></TouchableOpacity>
              <TouchableOpacity style={styles.nostalgicItem} activeOpacity={0.6} onPress={() => {setShowRequirementsModal(false); setTimeout(() => setShowZekatModal(true), 300);}}><Text style={styles.nostalgicItemTextHighlight}>Hassas Zekat Hesaplama</Text></TouchableOpacity>
              <TouchableOpacity style={styles.nostalgicItem} activeOpacity={0.6} onPress={() => {setShowRequirementsModal(false); setTimeout(() => setShowKurbanModal(true), 300);}}><Text style={styles.nostalgicItemTextHighlight}>Kurban Rehberi ve Fıkıh</Text></TouchableOpacity>
              <TouchableOpacity style={styles.nostalgicItem} activeOpacity={0.6} onPress={() => {setShowRequirementsModal(false); setTimeout(() => setShowHacModal(true), 300);}}><Text style={styles.nostalgicItemTextHighlight}>Hac ve Umre Hazırlık Listesi</Text></TouchableOpacity>
              <TouchableOpacity style={styles.nostalgicItem} activeOpacity={0.6} onPress={() => {setShowRequirementsModal(false); setTimeout(() => setShowCamilerModal(true), 300);}}><Text style={styles.nostalgicItemTextHighlight}>Yakındaki Camiler</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showItikafModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.nostalgicModalContainer}>
            <View style={styles.nostalgicModalHeader}>
              <TouchableOpacity style={{ width: 40 }} activeOpacity={0.6} onPress={() => { setShowItikafModal(false); setTimeout(() => setShowRequirementsModal(true), 300); }}><Text style={styles.nostalgicBackArrow}>{"<"}</Text></TouchableOpacity>
              <Text style={[styles.nostalgicModalTitle, { flex: 1, textAlign: 'center' }]}>DİJİTAL İTİKAF</Text>
              <TouchableOpacity style={{ width: 40, alignItems: 'flex-end' }} activeOpacity={0.6} onPress={() => setShowItikafModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.nostalgicItemText, { textAlign: 'center', marginBottom: 20 }]}>"Gerçek özgürlük, ekrana değil; Rabbine ve kalbine bağlanmaktır."</Text>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 50, marginBottom: 20 }}>📵</Text>
               <TouchableOpacity style={[styles.saveBudgetButtonHalf, {width: '80%', paddingVertical: 15, height: 'auto', minHeight: 55, flex: 0}]} activeOpacity={0.6} onPress={() => Alert.alert('Dijital İtikaf', 'İtikaf niyetiniz kabul olsun. Şimdi telefonu sessize alıp kenara bırakabilirsiniz.')}><Text style={styles.saveBudgetBtnText}>Niyet Et ve Başla</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCumaModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.nostalgicModalContainer}>
            <View style={styles.nostalgicModalHeader}>
              <TouchableOpacity style={{ width: 40 }} activeOpacity={0.6} onPress={() => { setShowCumaModal(false); setTimeout(() => setShowRequirementsModal(true), 300); }}><Text style={styles.nostalgicBackArrow}>{"<"}</Text></TouchableOpacity>
              <Text style={[styles.nostalgicModalTitle, { flex: 1, textAlign: 'center' }]}>CUMA MESAJLARI</Text>
              <TouchableOpacity style={{ width: 40, alignItems: 'flex-end' }} activeOpacity={0.6} onPress={() => setShowCumaModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {dailyMessages.map((msg, index) => (
                <View key={index} style={styles.nostalgicMessageCard}><Text style={styles.nostalgicItemText}>"{msg}"</Text><TouchableOpacity style={styles.shareButton} activeOpacity={0.6} onPress={() => shareMessage(msg)}><Text style={styles.shareButtonText}>Paylaş 📤</Text></TouchableOpacity></View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showZekatModal} animationType="fade" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.nostalgicModalContainer}>
            <View style={styles.nostalgicModalHeader}>
              <TouchableOpacity style={{ width: 40 }} activeOpacity={0.6} onPress={() => { setShowZekatModal(false); setTimeout(() => setShowRequirementsModal(true), 300); }}><Text style={styles.nostalgicBackArrow}>{"<"}</Text></TouchableOpacity>
              <Text style={[styles.nostalgicModalTitle, { flex: 1, textAlign: 'center', fontSize: 18 }]}>ZEKAT HESAPLAMA</Text>
              <TouchableOpacity style={{ width: 40, alignItems: 'flex-end' }} activeOpacity={0.6} onPress={() => setShowZekatModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.nostalgicItemTextHighlight, {marginBottom: 5}]}>Nakit Paran (₺):</Text><TextInput style={styles.nostalgicInputBox} keyboardType="numeric" placeholder="0" placeholderTextColor="#A0AAB5" value={zekatNakit} onChangeText={setZekatNakit} />
              <Text style={[styles.nostalgicItemTextHighlight, {marginBottom: 5}]}>Altın / Gümüş (₺ Değeri):</Text><TextInput style={styles.nostalgicInputBox} keyboardType="numeric" placeholder="0" placeholderTextColor="#A0AAB5" value={zekatAltin} onChangeText={setZekatAltin} />
              <Text style={[styles.nostalgicItemTextHighlight, {marginBottom: 5}]}>Alacakların (₺):</Text><TextInput style={styles.nostalgicInputBox} keyboardType="numeric" placeholder="0" placeholderTextColor="#A0AAB5" value={zekatAlacak} onChangeText={setZekatAlacak} />
              <Text style={[styles.nostalgicItemTextHighlight, {marginBottom: 5}]}>Borçların (₺):</Text><TextInput style={styles.nostalgicInputBox} keyboardType="numeric" placeholder="0" placeholderTextColor="#A0AAB5" value={zekatBorc} onChangeText={setZekatBorc} />
              <View style={styles.nostalgicSeparator} />
              <Text style={[styles.nostalgicModalTitle, { textAlign: 'center' }]}>Düşen Zekat Miktarı:</Text><Text style={[styles.nostalgicItemTextHighlight, { fontSize: width * 0.08, textAlign: 'center', color: '#D32F2F' }]}>{calculateZekat()} ₺</Text><Text style={[styles.nostalgicItemText, { fontSize: 12, textAlign: 'center', marginTop: 10 }]}>*(Zekat düşmesi için net servetinizin nisap miktarını aşması ve üzerinden 1 yıl geçmesi gereklidir.)*</Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showKurbanModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.nostalgicModalContainer}>
            <View style={styles.nostalgicModalHeader}>
              <TouchableOpacity style={{ width: 40 }} activeOpacity={0.6} onPress={() => { setShowKurbanModal(false); setTimeout(() => setShowRequirementsModal(true), 300); }}><Text style={styles.nostalgicBackArrow}>{"<"}</Text></TouchableOpacity>
              <Text style={[styles.nostalgicModalTitle, { flex: 1, textAlign: 'center' }]}>KURBAN REHBERİ</Text>
              <TouchableOpacity style={{ width: 40, alignItems: 'flex-end' }} activeOpacity={0.6} onPress={() => setShowKurbanModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.nostalgicItemTextHighlight}>Kimlere Farzdır?</Text><Text style={styles.nostalgicItemText}>Akıl sağlığı yerinde, ergenliğe ulaşmış, dini ölçülere göre zengin (nisap miktarı mala sahip) ve mukim olan her Müslümana vaciptir.</Text>
              <View style={styles.nostalgicSeparator} />
              <Text style={styles.nostalgicItemTextHighlight}>Hangi Hayvanlar Kesilir?</Text><Text style={styles.nostalgicItemText}>Koyun, keçi (en az 1 yaş), sığır, manda (en az 2 yaş) ve deve (en az 5 yaş).</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showHacModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.nostalgicModalContainer}>
            <View style={styles.nostalgicModalHeader}>
              <TouchableOpacity style={{ width: 40 }} activeOpacity={0.6} onPress={() => { setShowHacModal(false); setTimeout(() => setShowRequirementsModal(true), 300); }}><Text style={styles.nostalgicBackArrow}>{"<"}</Text></TouchableOpacity>
              <Text style={[styles.nostalgicModalTitle, { flex: 1, textAlign: 'center', fontSize: 18 }]}>HAC VE UMRE LİSTESİ</Text>
              <TouchableOpacity style={{ width: 40, alignItems: 'flex-end' }} activeOpacity={0.6} onPress={() => setShowHacModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.nostalgicItemText}>[ ] İhramlık havlu (2 takım)</Text><Text style={styles.nostalgicItemText}>[ ] Kokusuz sabun ve şampuan</Text><Text style={styles.nostalgicItemText}>[ ] Rahat tavaf patiği / terliği</Text><Text style={styles.nostalgicItemText}>[ ] Küçük boy Kur'an-ı Kerim</Text><Text style={styles.nostalgicItemText}>[ ] Boyun askılı cüzdan</Text><Text style={styles.nostalgicItemText}>[ ] Temel ilk yardım ilaçları</Text><Text style={styles.nostalgicItemText}>[ ] Bolca dua ve tövbe niyeti...</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCamilerModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.nostalgicModalContainer}>
            <View style={styles.nostalgicModalHeader}>
              <TouchableOpacity style={{ width: 40 }} activeOpacity={0.6} onPress={() => { setShowCamilerModal(false); setTimeout(() => setShowRequirementsModal(true), 300); }}><Text style={styles.nostalgicBackArrow}>{"<"}</Text></TouchableOpacity>
              <Text style={[styles.nostalgicModalTitle, { flex: 1, textAlign: 'center' }]}>YAKINDAKİ CAMİLER</Text>
              <TouchableOpacity style={{ width: 40, alignItems: 'flex-end' }} activeOpacity={0.6} onPress={() => setShowCamilerModal(false)}><Text style={styles.nostalgicClose}>X</Text></TouchableOpacity>
            </View>
            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              <TouchableOpacity style={styles.mapButtonFull} activeOpacity={0.6} onPress={openMapsForMosques}><Text style={{fontSize: 50, marginBottom: 10}}>📍</Text><Text style={styles.mapButtonLabel}>En Yakın Camileri Haritada Göster</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showNotebookModal} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.notebookModalContainer}>
            <View style={styles.notebookHeaderRow}>
              <Text style={styles.notebookTitle}>{t.notebookTitle}</Text>
              <TouchableOpacity activeOpacity={0.6} onPress={() => setShowNotebookModal(false)}><Text style={styles.notebookClose}>X</Text></TouchableOpacity>
            </View>
            <TextInput style={styles.notebookInput} autoFocus={true} multiline={true} placeholder={t.notebookPlaceholder} placeholderTextColor="#8B5A2B" value={notebookText} onChangeText={handleSaveNotes} textAlignVertical="top" />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showBudgetModal} animationType="fade" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.budgetModalContainer}>
            <View style={styles.budgetModalHeader}>
              <Text style={styles.budgetModalTitle}>{t.budgetSetupTitle}</Text>
              <TouchableOpacity activeOpacity={0.6} onPress={() => setShowBudgetModal(false)}><Text style={styles.closeSidePanelText}>×</Text></TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>{t.monthlyIncome}</Text><TextInput style={styles.budgetInput} placeholder="Örn: 45000" placeholderTextColor="#A0AAB5" keyboardType="numeric" value={monthlyIncome} onChangeText={setMonthlyIncome} />
            <Text style={styles.inputLabel}>{t.fixedExp}</Text><TextInput style={styles.budgetInput} placeholder="Örn: 15000" placeholderTextColor="#A0AAB5" keyboardType="numeric" value={fixedExpense} onChangeText={setFixedExpense} />
            <View style={styles.actionButtonsRowModal}>
              <TouchableOpacity style={styles.saveBudgetButtonHalf} activeOpacity={0.6} onPress={handleSaveBudgetSetup}><Text style={styles.saveBudgetBtnText}>{t.saveBlessing}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.resetBudgetButtonHalf} activeOpacity={0.6} onPress={handleFullBudgetReset}><Text style={styles.resetButtonTextBtn}>⟲ {t.resetBudget}</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={dropdownVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.dropdownModalContainer}>
            <Text style={styles.dropdownTitle}>{t.selectDhikr}</Text>
            {!isKeyboardVisible && (
              <ScrollView style={styles.dropdownList}>
                {zikirList.map(z => (
                  <TouchableOpacity key={z.id} style={[styles.dropdownItem, activeZikirId === z.id && styles.activeDropdownItem]} activeOpacity={0.6} onPress={() => { setActiveZikirId(z.id); setDropdownVisible(false); }}>
                    <Text style={[styles.dropdownItemText, activeZikirId === z.id && styles.activeDropdownItemText]} numberOfLines={1}>{z.text}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <View style={styles.addZikirContainer}>
              <TextInput style={styles.addZikirInput} placeholder={t.addCustom} placeholderTextColor="#A0AAB5" value={newZikirText} onChangeText={setNewZikirText} />
              <TouchableOpacity style={styles.addZikirButton} activeOpacity={0.6} onPress={handleAddZikir}><Text style={styles.addZikirButtonText}>{t.addBtn}</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.closeButton} activeOpacity={0.6} onPress={() => setDropdownVisible(false)}><Text style={styles.closeButtonText}>{t.close}</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={quranDropdownVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.dropdownModalContainer}>
            <Text style={styles.dropdownTitle}>{t.quran}</Text>
            <ScrollView style={styles.dropdownList}>
              {quranList.map((surah, idx) => (
                <TouchableOpacity key={surah.id} style={[styles.dropdownItem, currentSurahIdx === idx && styles.activeDropdownItem]} activeOpacity={0.6} onPress={() => handleSelectSurah(idx)}>
                  <Text style={[styles.dropdownItemText, currentSurahIdx === idx && styles.activeDropdownItemText]}>{surah.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} activeOpacity={0.6} onPress={() => setQuranDropdownVisible(false)}><Text style={styles.closeButtonText}>{t.close}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={infoModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalContainer}>
            <Text style={styles.infoModalTitle}>{infoContent.title}</Text>
            <Text style={styles.infoModalText}>{infoContent.text}</Text>
            <TouchableOpacity style={styles.closeButton} activeOpacity={0.6} onPress={() => setInfoModalVisible(false)}><Text style={styles.closeButtonText}>{t.close}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSettings} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalContainer}>
            <Text style={styles.modalTitle}>{t.settings}</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t.autoLocation}</Text>
                {locationEnabled && (<Text style={styles.locationSubtitle}>{t.currentLocation}: {t.city}</Text>)}
              </View>
              <Switch trackColor={{ false: '#1A2138', true: '#FFFFFF' }} thumbColor={locationEnabled ? '#E0E6ED' : '#A0AAB5'} onValueChange={() => setLocationEnabled(!locationEnabled)} value={locationEnabled} />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}><Text style={styles.settingLabel}>{t.notifications}</Text></View>
              <Switch trackColor={{ false: '#1A2138', true: '#FFFFFF' }} thumbColor={notificationsEnabled ? '#E0E6ED' : '#A0AAB5'} onValueChange={() => setNotificationsEnabled(!notificationsEnabled)} value={notificationsEnabled} />
            </View>
            <Text style={styles.languageSectionTitle}>{t.language}</Text>
            <View style={styles.languageListWrapper}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                {(Object.keys(translations) as Array<keyof typeof translations>).map((key) => (
                  <TouchableOpacity key={key} style={[styles.languageOption, lang === key && styles.languageOptionSelected]} activeOpacity={0.6} onPress={() => setLang(key)}>
                    <Text style={[styles.languageText, lang === key && styles.languageTextSelected]}>{translations[key].languageName}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <TouchableOpacity style={styles.closeButton} activeOpacity={0.6} onPress={() => setShowSettings(false)}><Text style={styles.closeButtonText}>{t.close}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // CONTAINER İÇİN EKRAN TEPESİ (STATUS BAR) KORUMASI EKLENDİ
  container: { flex: 1, backgroundColor: '#050812', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  mainWrapper: { flex: 1 },
  screenView: { flex: 1 }, 
  
  // SPLASH EKRANI YAZILARI ESNEKLEŞTİRİLDİ
  splashContent: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 10, width: '100%', height: '100%' },
  splashTitle: { fontSize: width * 0.12, fontWeight: 'bold', color: '#FFFFFF', letterSpacing: 2, textShadowColor: 'rgba(255, 255, 255, 0.5)', textShadowRadius: 15 },
  bismillah: { fontSize: width * 0.05, color: '#E0E6ED', marginTop: height * 0.03, letterSpacing: 1, opacity: 0.9 }, 
  splashHint: { color: '#A0AAB5', marginTop: height * 0.05, fontSize: width * 0.03, fontStyle: 'italic', opacity: 0.6 },
  
  // ÜST BAŞLIK: PADDING DÜŞÜRÜLDÜ VE BUTTON İÇERİĞİ KORUNDU
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: width * 0.05, paddingTop: height * 0.01, paddingBottom: height * 0.01, minHeight: 50 },
  headerRightControls: { flexDirection: 'row', alignItems: 'center' },
  kibleTopButton: { backgroundColor: 'rgba(255, 215, 0, 0.1)', paddingHorizontal: width * 0.04, paddingVertical: height * 0.01, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.5)', flexShrink: 1 },
  kibleTopButtonText: { color: '#FFD700', fontSize: width * 0.035, fontWeight: 'bold', letterSpacing: 1 },
  settingsButton: { padding: width * 0.015 },
  settingsIcon: { fontSize: width * 0.06, color: '#FFFFFF' },
  
  kaabaIconContainer: { width: 26, height: 30, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#000', alignItems: 'center', paddingTop: 4, shadowColor: '#FFD700', shadowOpacity: 0.5, shadowRadius: 10 },
  kaabaGoldBand: { width: '100%', height: 4, backgroundColor: '#FFD700' },
  homeContentWrapper: { flex: 1, justifyContent: 'space-around' }, 
  
  // SAAT VE TARİH KISMI ESNEKLEŞTİRİLDİ
  heroSection: { alignItems: 'center', paddingBottom: height * 0.01, marginTop: height * 0.01 },
  dateText: { fontSize: width * 0.04, color: '#A0AAB5', textTransform: 'uppercase', letterSpacing: 1, marginBottom: height * 0.01 },
  clockText: { fontSize: width * 0.15, color: '#FFFFFF', fontWeight: '300', letterSpacing: 3, textShadowColor: 'rgba(255,255,255,0.4)', textShadowRadius: 15, marginBottom: height * 0.02 },
  countdownBox: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: width * 0.06, paddingVertical: height * 0.015, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' },
  countdownLabel: { fontSize: width * 0.03, color: '#A0AAB5', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  countdownTime: { fontSize: width * 0.06, color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 2 },
  
  // KAYDIRMALI KARTLAR ESNEKLEŞTİRİLDİ
  carouselSection: { height: height * 0.40, paddingBottom: 5 }, 
  card: { width: width * 0.85, height: height * 0.35, minHeight: 280, backgroundColor: '#080C17', borderRadius: 20, padding: width * 0.05, marginHorizontal: width * 0.025, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', shadowColor: '#FFF', shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: width * 0.035, color: '#8A95A5', fontWeight: 'bold', letterSpacing: 2 },
  infoButton: { width: width * 0.06, height: width * 0.06, borderRadius: width * 0.03, borderWidth: 1, borderColor: '#A0AAB5', justifyContent: 'center', alignItems: 'center' },
  infoIcon: { color: '#A0AAB5', fontSize: width * 0.03, fontWeight: 'bold', fontStyle: 'italic' },
  prayerList: { flex: 1, justifyContent: 'space-between' },
  prayerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: height * 0.008, paddingHorizontal: width * 0.025, borderRadius: 8 },
  activePrayerRow: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  prayerName: { fontSize: width * 0.04, color: '#A0AAB5' },
  prayerTime: { fontSize: width * 0.04, color: '#A0AAB5', fontWeight: 'bold' },
  activePrayerText: { color: '#FFFFFF', fontWeight: 'bold' },
  biorhythmContent: { flex: 1, justifyContent: 'space-around', paddingVertical: 5 },
  bioRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bioLabel: { width: width * 0.25, color: '#E0E6ED', fontSize: width * 0.035 },
  bioBarBg: { flex: 1, height: height * 0.008, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 5, marginHorizontal: 10, overflow: 'hidden' },
  bioBarFill: { height: '100%', borderRadius: 5 },
  bioPercent: { width: width * 0.1, color: '#FFFFFF', fontSize: width * 0.035, fontWeight: 'bold', textAlign: 'right' },
  esmaContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
  esmaName: { fontSize: width * 0.06, color: '#FFFFFF', fontWeight: 'bold', marginBottom: 10, letterSpacing: 1 },
  esmaDesc: { fontSize: width * 0.035, color: '#A0AAB5', textAlign: 'center', lineHeight: 20 },
  paginationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 }, 
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 5 },
  activeDot: { width: 24, backgroundColor: '#FFFFFF' }, 
  
  // ALT MENÜ SABİTLİKTEN ÇIKARTILDI
  bottomTabBar: { 
    width: '100%', 
    height: height * 0.1, // Yüksekliği biraz artırdık
    minHeight: 80, // Ezilmemesi için minimum yükseklik verdik
    backgroundColor: '#0A0F1D', 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    borderTopWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)', 
    // İŞTE ÇÖZÜM BURADA: Android sanal tuşları için 25 birimlik güvenlik yastığı (boşluk) ekledik!
    paddingBottom: Platform.OS === 'android' ? 25 : 30 
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  tabIcon: { fontSize: width * 0.055, color: '#555', marginBottom: height * 0.005 },
  activeTabIcon: { color: '#FFFFFF' },
  tabText: { fontSize: width * 0.03, color: '#555', fontWeight: 'bold' },
  activeTabText: { color: '#FFFFFF' },
  notificationBanner: { position: 'absolute', top: 0, left: 20, right: 20, backgroundColor: '#080C17', borderRadius: 15, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FFD700', zIndex: 999, shadowColor: '#FFD700', shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  notificationIcon: { fontSize: 30, marginRight: 15 },
  notificationTitle: { color: '#FFD700', fontSize: 18, fontWeight: 'bold' },
  notificationText: { color: '#E0E6ED', fontSize: 14, marginTop: 2 },
  zikirHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: width * 0.05, paddingVertical: height * 0.02 },
  zikirHeaderTitle: { color: '#FFFFFF', fontSize: width * 0.05, fontWeight: 'bold', letterSpacing: 2 },
  dropdownSelector: { backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: width * 0.05, marginTop: height * 0.01, paddingVertical: height * 0.02, paddingHorizontal: width * 0.05, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownSelectorText: { flex: 1, color: '#E0E6ED', fontSize: width * 0.045, fontWeight: '500', paddingRight: 10 },
  dropdownArrow: { color: '#A0AAB5', fontSize: 14 },
  
  // ZİKİRMATİK YAZISI EKRAN BOYUNA GÖRE ESNEKLEŞTİ
  zikirCenterArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  zikirCounterNumber: { color: '#FFFFFF', fontSize: height * 0.12, fontWeight: 'bold', letterSpacing: -3, textShadowColor: 'rgba(255,255,255,0.2)', textShadowRadius: 20 },
  modernZikirReset: { marginTop: height * 0.02, backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: height * 0.015, paddingHorizontal: width * 0.06, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  modernZikirResetText: { color: '#A0AAB5', fontSize: width * 0.035, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase' },
  zikirTapArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: height * 0.02 },
  zikirTapButton: { width: width * 0.45, height: width * 0.45, borderRadius: width * 0.225, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  zikirTapButtonInner: { width: '85%', height: '85%', borderRadius: width, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#FFF', shadowOpacity: 0.8, shadowRadius: 30 },
  zikirTapText: { color: '#050812', fontSize: width * 0.05, fontWeight: 'bold', letterSpacing: 2 },
  
  // KUR'AN ALANI (ÇARPIŞMAYI ÖNLEYEN ESNEK DÜZENLEME)
  quranCenterArea: { flex: 1, justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: width * 0.08, paddingBottom: height * 0.02 },
  albumArtContainer: { width: width * 0.45, height: width * 0.45, borderRadius: width * 0.225, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  albumArtInner: { width: '80%', height: '80%', borderRadius: width, backgroundColor: '#1A2138', justifyContent: 'center', alignItems: 'center', shadowColor: '#FFF', shadowOpacity: 0.2, shadowRadius: 20 },
  albumArtIcon: { fontSize: width * 0.15, color: '#E0E6ED' },
  quranTitleText: { color: '#FFFFFF', fontSize: width * 0.06, fontWeight: 'bold', letterSpacing: 1, marginBottom: 5, textAlign: 'center' },
  quranSubtitleText: { color: '#A0AAB5', fontSize: width * 0.04, textAlign: 'center' },
  progressContainer: { width: '100%' },
  progressBarBg: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 3 },
  progressTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressTimeText: { color: '#A0AAB5', fontSize: 12 },
  playerControlsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%' },
  controlButtonSmall: { padding: width * 0.04 },
  controlButtonLarge: { width: width * 0.18, height: width * 0.18, borderRadius: width * 0.09, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginHorizontal: width * 0.06, shadowColor: '#FFF', shadowOpacity: 0.3, shadowRadius: 15 },
  dropdownModalContainer: { width: '90%', backgroundColor: '#1A2138', borderRadius: 15, padding: width * 0.05, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  dropdownTitle: { fontSize: width * 0.05, color: '#FFFFFF', fontWeight: 'bold', marginBottom: height * 0.02, textAlign: 'center' },
  dropdownList: { maxHeight: height * 0.3, marginBottom: 15 },
  dropdownItem: { paddingVertical: height * 0.02, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  activeDropdownItem: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 8 },
  dropdownItemText: { color: '#A0AAB5', fontSize: width * 0.04, textAlign: 'center' },
  activeDropdownItemText: { color: '#FFFFFF', fontWeight: 'bold' },
  addZikirContainer: { flexDirection: 'row', paddingTop: 10, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  addZikirInput: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, paddingHorizontal: 15, color: '#FFFFFF', fontSize: width * 0.04, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginRight: 10, height: height * 0.06 },
  addZikirButton: { backgroundColor: '#FFFFFF', paddingHorizontal: 15, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  addZikirButtonText: { color: '#050812', fontSize: 14, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  settingsModalContainer: { width: '85%', backgroundColor: '#080C17', borderRadius: 15, padding: width * 0.06, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  settingTextContainer: { flex: 1, paddingRight: 10 },
  settingLabel: { fontSize: width * 0.045, color: '#FFFFFF', fontWeight: '500' },
  locationSubtitle: { fontSize: width * 0.03, color: '#A0AAB5', marginTop: 4, fontStyle: 'italic' },
  languageSectionTitle: { fontSize: width * 0.035, color: '#A0AAB5', marginBottom: 10, textTransform: 'uppercase', textAlign: 'center' },
  languageListWrapper: { height: height * 0.2, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)', marginVertical: 10 },
  languageOption: { paddingVertical: height * 0.02, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  languageOptionSelected: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  languageText: { color: '#8A95A5', fontSize: width * 0.04, textAlign: 'center' },
  languageTextSelected: { color: '#FFFFFF', fontWeight: 'bold' },
  infoModalContainer: { width: '80%', backgroundColor: '#1A2138', borderRadius: 15, padding: width * 0.06, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  modalTitle: { fontSize: width * 0.055, color: '#FFFFFF', fontWeight: 'bold', marginBottom: height * 0.03, textAlign: 'center' },
  infoModalTitle: { fontSize: width * 0.05, color: '#E0E6ED', fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  infoModalText: { fontSize: width * 0.04, color: '#A0AAB5', textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  closeButton: { backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: height * 0.015, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  closeButtonText: { color: '#FFFFFF', fontSize: width * 0.04, fontWeight: 'bold' },
  sidePanelContainer: { position: 'absolute', right: 0, top: 0, bottom: 0, width: width, backgroundColor: '#050812', zIndex: 100 },
  sidePanelContent: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 50, paddingHorizontal: 20, zIndex: 2 },
  sidePanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: height * 0.03, marginTop: height * 0.02 },
  qiblaTitle: { fontSize: width * 0.06, color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 2, textShadowColor: 'rgba(255,255,255,0.3)', textShadowRadius: 10 },
  closeSidePanelButton: { padding: width * 0.025, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  closeSidePanelText: { fontSize: width * 0.06, color: '#E0E6ED', fontWeight: 'bold' },
  calibrationWarning: { backgroundColor: 'rgba(255,215,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)', borderRadius: 15, padding: 15, alignItems: 'center', marginBottom: 20 },
  calibrationText: { color: '#FFD700', fontSize: 14, fontWeight: 'bold', textAlign: 'center', letterSpacing: 1 },
  calibrationThinRedText: { color: '#FF4444', fontSize: width * 0.03, fontStyle: 'italic', marginTop: height * 0.04, textAlign: 'center', letterSpacing: 0.5, opacity: 0.8 },
  qiblaCompassContainer: { flex: 1, alignItems: 'center', paddingTop: 10 },
  compassRingOuter: { width: width * 0.88, height: width * 0.88, borderRadius: width * 0.44, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  compassRing: { width: width * 0.80, height: width * 0.80, borderRadius: width * 0.40, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(8, 12, 23, 0.9)', justifyContent: 'center', alignItems: 'center', shadowColor: '#00BFFF', shadowOpacity: 0.15, shadowRadius: 30, elevation: 10 },
  compassDisk: { width: '100%', height: '100%', borderRadius: width, justifyContent: 'center', alignItems: 'center' },
  directionText: { position: 'absolute', color: '#A0AAB5', fontSize: width * 0.05, fontWeight: 'bold', letterSpacing: 1 },
  northLine: { position: 'absolute', top: 40, width: 3, height: 25, backgroundColor: '#FF4444', borderRadius: 2, shadowColor: '#FF4444', shadowOpacity: 0.8, shadowRadius: 5 },
  qiblaArrowWrapper: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', position: 'absolute' },
  qiblaDashedLine: { width: 2, height: '42%', borderStyle: 'dashed', borderWidth: 1, borderColor: '#FFD700', marginTop: 5, opacity: 0.7 },
  compassDegreeLine: { position: 'absolute', width: 2, height: 8, backgroundColor: 'rgba(255,255,255,0.15)' },
  qiblaInfoBox: { marginTop: height * 0.05, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: width * 0.1, paddingVertical: height * 0.02, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10 },
  qiblaInfoLabel: { fontSize: width * 0.03, color: '#A0AAB5', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 3 },
  qiblaInfoValue: { fontSize: width * 0.1, color: '#FFFFFF', fontWeight: '300', textShadowColor: 'rgba(255,255,255,0.2)', textShadowRadius: 10 },
  qiblaSubText: { fontSize: width * 0.03, color: '#FFD700', marginTop: 8, fontStyle: 'italic', letterSpacing: 1 },
  budgetHeaderOverlay: { alignItems: 'center', paddingTop: height * 0.02, paddingBottom: height * 0.01 },
  budgetHeaderTitle: { color: '#FFFFFF', fontSize: width * 0.055, fontWeight: 'bold', letterSpacing: 1 },
  budgetHeaderSub: { color: '#A0AAB5', fontSize: width * 0.035, fontStyle: 'italic', marginTop: 4 },
  budgetSetupContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: width * 0.05 },
  budgetSetupBox: { width: '100%', backgroundColor: '#080C17', padding: width * 0.06, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  setupIcon: { fontSize: width * 0.1, marginBottom: 15 },
  setupTitle: { color: '#FFFFFF', fontSize: width * 0.045, fontWeight: 'bold', marginBottom: 10 },
  setupDesc: { color: '#A0AAB5', fontSize: width * 0.035, textAlign: 'center', marginBottom: 25, lineHeight: 20 },
  setupButton: { backgroundColor: '#FFFFFF', paddingVertical: height * 0.015, paddingHorizontal: width * 0.08, borderRadius: 25 },
  setupButtonText: { color: '#050812', fontSize: width * 0.04, fontWeight: 'bold' },
  
  // BÜTÇE KARTLARI ESNEKLEŞTİRİLDİ
  budgetMainCard: { backgroundColor: '#080C17', margin: width * 0.05, marginTop: height * 0.02, borderRadius: 20, paddingVertical: height * 0.04, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  budgetCircleOuter: { width: width * 0.55, height: width * 0.55, borderRadius: width * 0.275, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
  budgetCircleInner: { width: width * 0.5, height: width * 0.5, borderRadius: width * 0.25, borderWidth: 2, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050812' },
  budgetAmountText: { color: '#FFFFFF', fontSize: width * 0.1, fontWeight: '300' },
  budgetSparkleText: { color: '#E0E6ED', fontSize: width * 0.03, marginTop: height * 0.03, fontStyle: 'italic' },
  fastExpenseCard: { backgroundColor: '#080C17', marginHorizontal: width * 0.05, borderRadius: 20, padding: width * 0.05, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  fastExpenseTitle: { color: '#8A95A5', fontSize: width * 0.035, fontWeight: 'bold', letterSpacing: 1 },
  spendInputFull: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, color: '#FFFFFF', fontSize: width * 0.04, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', height: height * 0.06, marginBottom: 10, width: '100%' },
  actionButtonsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  spendButtonHalf: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderRadius: 12, height: height * 0.06, marginRight: 5 },
  resetButtonHalf: { flex: 1, backgroundColor: '#FF4444', justifyContent: 'center', alignItems: 'center', borderRadius: 12, height: height * 0.06, marginLeft: 5, borderWidth: 1, borderColor: '#CC0000' },
  spendButtonText: { color: '#050812', fontWeight: 'bold', fontSize: width * 0.035, letterSpacing: 1 },
  resetButtonTextBtn: { color: '#FFFFFF', fontWeight: 'bold', fontSize: width * 0.035, letterSpacing: 1 },
  openNotebookButton: { backgroundColor: '#080C17', marginHorizontal: width * 0.05, marginTop: height * 0.02, borderRadius: 15, paddingVertical: height * 0.02, borderWidth: 1, borderColor: '#8B5A2B', alignItems: 'center' },
  openNotebookText: { color: '#E8DCC4', fontSize: width * 0.04, fontWeight: 'bold', letterSpacing: 1 },
  budgetSettingsRow: { flexDirection: 'row', width: '100%', justifyContent: 'center', marginTop: height * 0.04, paddingHorizontal: 10 },
  budgetSettingsText: { color: '#8A95A5', fontSize: width * 0.035, marginRight: 10 },
  budgetSettingsLink: { color: '#FFFFFF', fontSize: width * 0.035, textDecorationLine: 'underline' },
  actionButtonsRowModal: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: height * 0.04 },
  saveBudgetButtonHalf: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderRadius: 10, height: height * 0.06, marginRight: 5 },
  resetBudgetButtonHalf: { flex: 1, backgroundColor: '#FF4444', justifyContent: 'center', alignItems: 'center', borderRadius: 10, height: height * 0.06, marginLeft: 5, borderWidth: 1, borderColor: '#CC0000' },
  saveBudgetBtnText: { color: '#050812', fontWeight: 'bold', fontSize: width * 0.04 },
  budgetModalContainer: { width: '90%', backgroundColor: '#1A2138', borderRadius: 20, padding: width * 0.06, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  budgetModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: height * 0.02 },
  budgetModalTitle: { color: '#FFFFFF', fontSize: width * 0.045, fontWeight: 'bold' },
  inputLabel: { color: '#A0AAB5', fontSize: width * 0.035, marginBottom: 8, marginTop: 15 },
  budgetInput: { backgroundColor: '#0A0F1D', color: '#FFFFFF', fontSize: width * 0.04, borderRadius: 10, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  nostalgicCard: { backgroundColor: '#F4ECD8', borderRadius: 15, paddingVertical: height * 0.04, marginBottom: height * 0.02, borderWidth: 2, borderColor: '#8B5A2B', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  nostalgicCardTitle: { color: '#3E2723', fontSize: width * 0.055, fontWeight: 'bold', letterSpacing: 2, fontStyle: 'italic', marginRight: 10 },
  nostalgicModalContainer: { width: '90%', maxHeight: '85%', backgroundColor: '#F4ECD8', borderRadius: 15, padding: width * 0.06, borderWidth: 2, borderColor: '#8B5A2B', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
  nostalgicModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#D4C4A8', paddingBottom: 15 },
  nostalgicModalTitle: { color: '#3E2723', fontSize: width * 0.055, fontWeight: 'bold', letterSpacing: 1, fontStyle: 'italic' },
  nostalgicBackArrow: { fontSize: width * 0.07, color: '#8B5A2B', fontWeight: 'bold' },
  nostalgicList: { marginBottom: 10 },
  nostalgicItem: { paddingVertical: height * 0.02, borderBottomWidth: 1, borderBottomColor: '#D4C4A8', marginBottom: 5, flexDirection: 'row', justifyContent: 'space-between' },
  nostalgicItemTextHighlight: { color: '#8B5A2B', fontSize: width * 0.045, fontWeight: 'bold', letterSpacing: 1, fontStyle: 'italic' },
  nostalgicItemText: { color: '#3E2723', fontSize: width * 0.04, fontWeight: '500', fontStyle: 'italic' },
  nostalgicSeparator: { height: 2, backgroundColor: '#8B5A2B', marginVertical: 15, marginHorizontal: 10, opacity: 0.5 },
  nostalgicClose: { fontSize: width * 0.06, color: '#8B5A2B', fontWeight: 'bold' },
  nostalgicInputBox: { backgroundColor: '#FFFDF0', color: '#3E2723', fontSize: width * 0.04, borderRadius: 8, padding: width * 0.03, borderWidth: 1, borderColor: '#D4C4A8', marginBottom: 15, fontStyle: 'italic' },
  nostalgicMessageCard: { backgroundColor: '#FFFDF0', padding: width * 0.05, borderRadius: 10, borderWidth: 1, borderColor: '#D4C4A8', marginBottom: 15 },
  shareButton: { marginTop: 15, alignSelf: 'flex-end', backgroundColor: 'rgba(139, 90, 43, 0.1)', paddingVertical: 6, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: '#8B5A2B' },
  shareButtonText: { color: '#8B5A2B', fontWeight: 'bold', fontSize: width * 0.035 },
  guideTextCard: { backgroundColor: '#FFFDF0', padding: width * 0.04, borderRadius: 10, borderWidth: 1, borderColor: '#D4C4A8', marginBottom: 15 },
  guideItemTitle: { color: '#8B5A2B', fontSize: width * 0.04, fontWeight: 'bold', marginBottom: 8 },
  guideItemDesc: { color: '#3E2723', fontSize: width * 0.035, lineHeight: 20, fontStyle: 'italic' },
  fullScreenImage: { width: '100%', height: height * 0.45, resizeMode: 'contain', marginBottom: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D4C4A8' },
  mapButtonFull: { backgroundColor: '#F4ECD8', padding: width * 0.08, borderRadius: 15, borderWidth: 2, borderColor: '#8B5A2B', alignItems: 'center', justifyContent: 'center', width: '100%' },
  mapButtonLabel: { color: '#3E2723', fontSize: width * 0.045, fontWeight: 'bold', textAlign: 'center' },
  esmaCard: { backgroundColor: '#FFFDF0', padding: width * 0.04, borderRadius: 10, borderWidth: 1, borderColor: '#D4C4A8', marginBottom: 10 },
  esmaCardTitle: { color: '#8B5A2B', fontSize: width * 0.045, fontWeight: 'bold', marginBottom: 5 },
  esmaCardText: { color: '#3E2723', fontSize: width * 0.035, fontStyle: 'italic', lineHeight: 22 },
  kazaRowContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: height * 0.02, borderBottomWidth: 1, borderBottomColor: '#D4C4A8' },
  kazaRowTitle: { color: '#3E2723', fontSize: width * 0.04, fontWeight: 'bold', fontStyle: 'italic' },
  kazaRowControls: { flexDirection: 'row', alignItems: 'center' },
  kazaMinusBtn: { backgroundColor: '#D32F2F', width: width * 0.09, height: width * 0.09, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  kazaPlusBtn: { backgroundColor: '#388E3C', width: width * 0.09, height: width * 0.09, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  kazaBtnText: { color: '#FFFFFF', fontSize: width * 0.05, fontWeight: 'bold' },
  kazaCountText: { color: '#3E2723', fontSize: width * 0.045, fontWeight: 'bold', width: 30, textAlign: 'center' },
  notebookModalContainer: { width: '90%', height: '65%', backgroundColor: '#F4ECD8', borderRadius: 8, padding: width * 0.05, borderWidth: 2, borderColor: '#8B5A2B', shadowColor: '#000', shadowOpacity: 0.8, shadowRadius: 15, elevation: 10 },
  notebookHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#D4C4A8', paddingBottom: 15, marginBottom: 15 },
  notebookTitle: { fontSize: width * 0.055, color: '#3E2723', fontWeight: 'bold', fontStyle: 'italic', letterSpacing: 1 },
  notebookClose: { fontSize: width * 0.06, color: '#8B5A2B', fontWeight: 'bold' },
  notebookInput: { flex: 1, fontSize: width * 0.045, lineHeight: 30, color: '#3E2723', textAlignVertical: 'top', fontStyle: 'italic' },
  elifbaCardContainer: { width: width * 0.18, height: height * 0.12, alignItems: 'center', justifyContent: 'center' },
  elifbaCardFront: { position: 'absolute', width: '100%', height: '100%', backgroundColor: '#FFFDF0', borderRadius: 10, borderWidth: 2, borderColor: '#8B5A2B', alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 3 },
  elifbaCardBack: { position: 'absolute', width: '100%', height: '100%', backgroundColor: '#8B5A2B', borderRadius: 10, borderWidth: 2, borderColor: '#D4C4A8', alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden' },
  elifbaArText: { fontSize: width * 0.1, color: '#3E2723', fontWeight: 'bold' },
  elifbaTrText: { fontSize: width * 0.05, color: '#FFFDF0', fontWeight: 'bold', fontStyle: 'italic' },
  infoButtonNostaljik: { width: width * 0.07, height: width * 0.07, borderRadius: width * 0.035, borderWidth: 2, borderColor: '#8B5A2B', justifyContent: 'center', alignItems: 'center' },
  infoIconNostaljik: { color: '#8B5A2B', fontSize: width * 0.04, fontWeight: 'bold', fontStyle: 'italic' },
  tabLabel: { fontSize: width * 0.04, color: '#8B5A2B', fontWeight: '500', fontStyle: 'italic' },
  activeTabLabel: { fontWeight: 'bold', textDecorationLine: 'underline' },
  gameMenuButton: { width: '80%', backgroundColor: '#8B5A2B', paddingVertical: height * 0.02, borderRadius: 10, marginBottom: 15, alignItems: 'center', borderWidth: 2, borderColor: '#D4C4A8' },
  gameMenuButtonText: { color: '#FFFDF0', fontSize: width * 0.045, fontWeight: 'bold', letterSpacing: 1 },
  scoreBoard: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(139, 90, 43, 0.1)', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#8B5A2B', marginBottom: 10 },
  scoreText: { color: '#3E2723', fontSize: width * 0.04, fontWeight: 'bold' },
  activePlayerScore: { color: '#D32F2F', textDecorationLine: 'underline' },
  memoryCardContainer: { width: width * 0.18, height: width * 0.22, alignItems: 'center', justifyContent: 'center' },
  memoryCardFront: { position: 'absolute', width: '100%', height: '100%', backgroundColor: '#D4C4A8', borderRadius: 8, borderWidth: 2, borderColor: '#8B5A2B', alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden', elevation: 2 },
  memoryCardBack: { position: 'absolute', width: '100%', height: '100%', backgroundColor: '#FFFDF0', borderRadius: 8, borderWidth: 2, borderColor: '#8B5A2B', alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden' },
  restartGameButton: { alignSelf: 'center', marginTop: 20, backgroundColor: '#3E2723', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8, borderWidth: 2, borderColor: '#8B5A2B' },
  restartGameButtonText: { color: '#FFFDF0', fontSize: width * 0.04, fontWeight: 'bold' },
  winText: { textAlign: 'center', color: '#4CAF50', fontSize: width * 0.05, fontWeight: 'bold', marginTop: 15, fontStyle: 'italic' }
});

export default App;