import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Download, ZoomIn, ZoomOut, Image as ImageIcon, 
  Palette, Trash2, Pencil, Lock, Zap, Star, 
  CreditCard, CheckCircle2, LogOut, User, RefreshCw, AlertCircle, PartyPopper
} from 'lucide-react';

// Firebase Imports
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, onSnapshot, updateDoc, increment, getDoc 
} from 'firebase/firestore';

// --- CRITICAL FIX: APP ID SANITIZATION ---
const rawAppId = 'pixel-paint-pro';
const sanitizedAppId = rawAppId.toString().replace(/[^a-zA-Z0-9_-]/g, '_');

// --- CONFIGURAÇÃO FIREBASE (PARA O VERCEL) ---
const fallbackConfig = {
  apiKey: "AIzaSyAK0g8KJ9j9xe4_ym20TtuzotzLLG4w7Vg",
  authDomain: "pixel-paint-pro.firebaseapp.com",
  projectId: "pixel-paint-pro",
  storageBucket: "pixel-paint-pro.firebasestorage.app",
  messagingSenderId: "995864402072",
  appId: "1:995864402072:web:54cf55c0bdf165057158ed",
  measurementId: "G-4F6FJE26FN"
};

const firebaseConfig = fallbackConfig;

let auth = null, db = null;
try {
  if (firebaseConfig.apiKey) {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.error("Firebase Initialization Error:", e);
}

const googleProvider = new GoogleAuthProvider();

// --- ADMIN ACCOUNTS & PROMO CODES ---
const ADMIN_EMAILS = [
  'rebelo.santos.1972@gmail.com'
];

const PROMO_CODES = {
  "REBELOPRO26": "rebelo.santos.1972@gmail.com"
};

// --- Utility Functions ---
const rgbToHex = (r, g, b) => "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
};

const colorDistance = (c1, c2) => {
  const rmean = (c1.r + c2.r) / 2;
  const r = c1.r - c2.r;
  const g = c1.g - c2.g;
  const b = c1.b - c2.b;
  return Math.sqrt((2 + rmean / 256) * r * r + 4 * g * g + (2 + (255 - rmean) / 256) * b * b);
};

const getContrastYIQ = (hexcolor) => {
  const hex = hexcolor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#FFFFFF';
};

const getPencilCursor = (color) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 2 22, crosshair`;
};

// Detetor de Navegador Embutido (TikTok, Instagram, Facebook)
const detectInAppBrowser = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return (ua.indexOf('FBAN') > -1) || 
         (ua.indexOf('FBAV') > -1) || 
         (ua.indexOf('Instagram') > -1) || 
         (ua.indexOf('TikTok') > -1);
};

// --- Comprehensive Color Map ---
const COLOR_MAP = [
  { name: 'Black', hex: '#000000' }, { name: 'Night', hex: '#0C090A' }, { name: 'Gunmetal', hex: '#2C3539' }, 
  { name: 'Midnight', hex: '#2B1B17' }, { name: 'Charcoal', hex: '#34282C' }, { name: 'Dark Slate Gray', hex: '#2F4F4F' }, 
  { name: 'Dim Gray', hex: '#696969' }, { name: 'Slate Gray', hex: '#708090' }, { name: 'Light Slate Gray', hex: '#778899' }, 
  { name: 'Gray', hex: '#808080' }, { name: 'Dark Gray', hex: '#A9A9A9' }, { name: 'Silver', hex: '#C0C0C0' }, 
  { name: 'Light Gray', hex: '#D3D3D3' }, { name: 'Gainsboro', hex: '#DCDCDC' }, { name: 'White Smoke', hex: '#F5F5F5' }, 
  { name: 'Ghost White', hex: '#F8F8FF' }, { name: 'Alice Blue', hex: '#F0F8FF' }, { name: 'White', hex: '#FFFFFF' },
  { name: 'Maroon', hex: '#800000' }, { name: 'Dark Red', hex: '#8B0000' }, { name: 'Firebrick', hex: '#B22222' }, 
  { name: 'Crimson', hex: '#DC143C' }, { name: 'Red', hex: '#FF0000' }, { name: 'Tomato', hex: '#FF6347' }, 
  { name: 'Coral', hex: '#FF7F50' }, { name: 'Indian Red', hex: '#CD5C5C' }, { name: 'Light Coral', hex: '#F08080' }, 
  { name: 'Dark Salmon', hex: '#E9967A' }, { name: 'Salmon', hex: '#FA8072' }, { name: 'Light Salmon', hex: '#FFA07A' }, 
  { name: 'Orange Red', hex: '#FF4500' }, { name: 'Dark Orange', hex: '#FF8C00' }, { name: 'Orange', hex: '#FFA500' },
  { name: 'Gold', hex: '#FFD700' }, { name: 'Dark Goldenrod', hex: '#B8860B' }, { name: 'Goldenrod', hex: '#DAA520' }, 
  { name: 'Pale Goldenrod', hex: '#EEE8AA' }, { name: 'Dark Khaki', hex: '#BDB76B' }, { name: 'Khaki', hex: '#F0E68C' }, 
  { name: 'Olive', hex: '#808000' }, { name: 'Yellow', hex: '#FFFF00' }, { name: 'Yellow Green', hex: '#9ACD32' }, 
  { name: 'Dark Olive Green', hex: '#556B2F' }, { name: 'Olive Drab', hex: '#6B8E23' }, { name: 'Lawn Green', hex: '#7CFC00' }, 
  { name: 'Chartreuse', hex: '#7FFF00' }, { name: 'Green Yellow', hex: '#ADFF2F' },
  { name: 'Dark Green', hex: '#006400' }, { name: 'Green', hex: '#008000' }, { name: 'Forest Green', hex: '#228B22' }, 
  { name: 'Lime', hex: '#00FF00' }, { name: 'Lime Green', hex: '#32CD32' }, { name: 'Light Green', hex: '#90EE90' }, 
  { name: 'Pale Green', hex: '#98FB98' }, { name: 'Dark Sea Green', hex: '#8FBC8F' }, { name: 'Medium Spring Green', hex: '#00FA9A' }, 
  { name: 'Spring Green', hex: '#00FF7F' }, { name: 'Sea Green', hex: '#2E8B57' }, { name: 'Medium Sea Green', hex: '#3CB371' }, 
  { name: 'Light Sea Green', hex: '#20B2AA' }, { name: 'Teal', hex: '#008080' },
  { name: 'Dark Cyan', hex: '#008B8B' }, { name: 'Cyan', hex: '#00FFFF' }, { name: 'Light Cyan', hex: '#E0FFFF' }, 
  { name: 'Dark Turquoise', hex: '#00CED1' }, { name: 'Turquoise', hex: '#40E0D0' }, { name: 'Medium Turquoise', hex: '#48D1CC' }, 
  { name: 'Pale Turquoise', hex: '#AFEEEE' }, { name: 'Aqua Marine', hex: '#7FFFD4' }, { name: 'Powder Blue', hex: '#B0E0E6' }, 
  { name: 'Cadet Blue', hex: '#5F9EA0' }, { name: 'Steel Blue', hex: '#4682B4' }, { name: 'Cornflower Blue', hex: '#6495ED' }, 
  { name: 'Deep Sky Blue', hex: '#00BFFF' }, { name: 'Dodger Blue', hex: '#1E90FF' }, { name: 'Light Blue', hex: '#ADD8E6' }, 
  { name: 'Sky Blue', hex: '#87CEEB' }, { name: 'Light Sky Blue', hex: '#87CEFA' },
  { name: 'Midnight Blue', hex: '#191970' }, { name: 'Navy', hex: '#000080' }, { name: 'Dark Blue', hex: '#00008B' }, 
  { name: 'Medium Blue', hex: '#0000CD' }, { name: 'Blue', hex: '#0000FF' }, { name: 'Royal Blue', hex: '#4169E1' }, 
  { name: 'Blue Violet', hex: '#8A2BE2' }, { name: 'Indigo', hex: '#4B0082' }, { name: 'Dark Slate Blue', hex: '#483D8B' }, 
  { name: 'Slate Blue', hex: '#6A5ACD' }, { name: 'Medium Slate Blue', hex: '#7B68EE' }, { name: 'Medium Purple', hex: '#9370DB' }, 
  { name: 'Dark Magenta', hex: '#8B008B' }, { name: 'Dark Violet', hex: '#9400D3' }, { name: 'Dark Orchid', hex: '#9932CC' }, 
  { name: 'Medium Orchid', hex: '#BA55D3' }, { name: 'Purple', hex: '#800080' },
  { name: 'Thistle', hex: '#D8BFD8' }, { name: 'Plum', hex: '#DDA0DD' }, { name: 'Violet', hex: '#EE82EE' }, 
  { name: 'Magenta', hex: '#FF00FF' }, { name: 'Orchid', hex: '#DA70D6' }, { name: 'Medium Violet Red', hex: '#C71585' }, 
  { name: 'Pale Violet Red', hex: '#DB7093' }, { name: 'Deep Pink', hex: '#FF1493' }, { name: 'Hot Pink', hex: '#FF69B4' }, 
  { name: 'Light Pink', hex: '#FFB6C1' }, { name: 'Pink', hex: '#FFC0CB' }, { name: 'Antique White', hex: '#FAEBD7' }, 
  { name: 'Beige', hex: '#F5F5DC' }, { name: 'Bisque', hex: '#FFE4C4' }, { name: 'Blanched Almond', hex: '#FFEBCD' },
  { name: 'Wheat', hex: '#F5DEB3' }, { name: 'Corn Silk', hex: '#FFF8DC' }, { name: 'Lemon Chiffon', hex: '#FFFACD' }, 
  { name: 'Light Goldenrod', hex: '#FAFAD2' }, { name: 'Light Yellow', hex: '#FFFFE0' }, { name: 'Saddle Brown', hex: '#8B4513' }, 
  { name: 'Sienna', hex: '#A0522D' }, { name: 'Chocolate', hex: '#D2691E' }, { name: 'Peru', hex: '#CD853F' }, 
  { name: 'Sandy Brown', hex: '#F4A460' }, { name: 'Burly Wood', hex: '#DEB887' }, { name: 'Tan', hex: '#D2B48C' }, 
  { name: 'Rosy Brown', hex: '#BC8F8F' }, { name: 'Moccasin', hex: '#FFE4B5' }, { name: 'Navajo White', hex: '#FFDEAD' }, 
  { name: 'Peach Puff', hex: '#FFDAB9' }, { name: 'Misty Rose', hex: '#FFE4E1' }, { name: 'Lavender Blush', hex: '#FFF0F5' }, 
  { name: 'Linen', hex: '#FAF0E6' }, { name: 'Old Lace', hex: '#FDF5E6' }, { name: 'Papaya Whip', hex: '#FFEFD5' }, 
  { name: 'Sea Shell', hex: '#FFF5EE' }, { name: 'Mint Cream', hex: '#F5FFFA' }, { name: 'Snow', hex: '#FFFAFA' }, 
  { name: 'Floral White', hex: '#FFFAF0' }, { name: 'Ivory', hex: '#FFFFF0' }, { name: 'Azure', hex: '#F0FFFF' }, 
  { name: 'Honeydew', hex: '#F0FFF0' }, { name: 'Lavender', hex: '#E6E6FA' }
];

const getBaseColorName = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  let minDistance = Infinity;
  let closestName = hex;
  for (const color of COLOR_MAP) {
    const cRgb = hexToRgb(color.hex);
    const dist = colorDistance(rgb, cRgb);
    if (dist < minDistance) {
      minDistance = dist;
      closestName = color.name;
    }
  }
  return closestName;
};

export default function App() {
  // --- States ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadsLeft, setDownloadsLeft] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentType, setPaymentType] = useState(null);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  // UI States
  const [showOriginal, setShowOriginal] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Settings
  const [bookSize, setBookSize] = useState('8.5×11');
  const [gridSize, setGridSize] = useState(62);
  const [maxColors, setMaxColors] = useState(24);
  const [shape, setShape] = useState('square');
  
  // App Core
  const [imageSrc, setImageSrc] = useState(null);
  const [imageName, setImageName] = useState("");
  const [viewMode, setViewMode] = useState('color'); // 'color' or 'number'
  const [zoom, setZoom] = useState(40);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeColorIndex, setActiveColorIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);

  const [processedData, setProcessedData] = useState({
    grid: [], palette: [], paletteNames: [], width: 0, height: 0, shape: 'square'
  });

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Referência para detetar mudanças reais de conta
  const previousUserRef = useRef(null);

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  // --- Reset Função (Limpa o Ecrã Visual) ---
  const handleReset = () => {
    setImageSrc(null);
    setImageName("");
    setProcessedData({ grid: [], palette: [], paletteNames: [], width: 0, height: 0, shape: 'square' });
    setIsEditing(false);
    setShowOriginal(false);
  };

  // --- LIMPEZA AUTOMÁTICA DE PRIVACIDADE ---
  useEffect(() => {
    const prevUser = previousUserRef.current;
    if (prevUser && user && prevUser.uid !== user.uid) {
      handleReset(); // Limpa imagem do utilizador anterior
    } else if (prevUser && !user) {
      handleReset();
    }
    previousUserRef.current = user;
  }, [user]);

  // --- Auth Effect & Browser Detection ---
  useEffect(() => {
    setIsInAppBrowser(detectInAppBrowser());

    if (!auth) { 
      setLoading(false); 
      return; 
    }
    
    const initAuth = async () => {
      try {
        await getRedirectResult(auth);
        // O utilizador só inicia sessão quando clicar no botão do Google!
      } catch (e) { 
        console.error("Auth init error:", e); 
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- FIRESTORE REALTIME SYNC & BLINDAGEM ANTI-FRAUDE ---
  useEffect(() => {
    if (!user || !db) return;
    
    const userDocRef = doc(db, 'artifacts', sanitizedAppId, 'users', user.uid, 'profile', 'data');

    const unsubscribe = onSnapshot(userDocRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()) && !data.isPremium) {
            updateDoc(userDocRef, { isPremium: true }).catch(e => console.error("Admin update error", e));
            setIsPremium(true);
            setDownloadsLeft(typeof data.downloadsLeft === 'number' ? data.downloadsLeft : 0);
          } else {
            setDownloadsLeft(typeof data.downloadsLeft === 'number' ? data.downloadsLeft : 0);
            setIsPremium(data.isPremium ?? false);
          }
        } else {
          const checkAdmin = user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
          setDownloadsLeft(0);
          setIsPremium(checkAdmin);
        }
      },
      (error) => console.error("Firestore Error:", error)
    );

    // --- STRIPE SUCCESS REDIRECT HANDLER ---
    const urlParams = new URLSearchParams(window.location.search);
    const isSuccess = urlParams.get('success');
    const packType = urlParams.get('type');
    const sessionId = urlParams.get('session_id'); 

    if (isSuccess === 'true' && packType) {
      
      if (user.isAnonymous) {
        alert("⚠️ QUASE LÁ! O teu pagamento foi detetado e está guardado neste link.\n\nPor favor, clica em 'Sign in with Google' na barra do lado esquerdo para receberes os teus créditos na conta certa.");
        return;
      }

      if (!sessionId || sessionId === '{CHECKOUT_SESSION_ID}') {
        alert("⚠️ ERRO DE LIGAÇÃO STRIPE: O Stripe não enviou o número do recibo seguro.");
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      setIsVerifyingPayment(true);

      const processPayment = async () => {
        try {
          const sessionRef = doc(db, 'artifacts', sanitizedAppId, 'users', user.uid, 'used_sessions', sessionId);

          const sessionSnap = await getDoc(sessionRef);

          // Se já foi usado
          if (sessionSnap.exists()) {
            const data = sessionSnap.data();

            if (data.redeemedBy === user.uid) {
              window.history.replaceState({}, document.title, window.location.pathname);
              setIsVerifyingPayment(false);
              return;
            } else {
              alert("🔒 Pagamento já usado noutra conta.");
              setIsVerifyingPayment(false);
              return;
            }
          }

          // Guardar sessão
          await setDoc(sessionRef, {
            redeemedBy: user.uid,
            redeemedAt: new Date().toISOString(),
            type: packType
          });

          const userDocRef = doc(db, 'artifacts', sanitizedAppId, 'users', user.uid, 'profile', 'data');
          const userSnap = await getDoc(userDocRef);

          if (packType === '10') {
            if (!userSnap.exists()) {
              await setDoc(userDocRef, { downloadsLeft: 10, isPremium: false });
            } else {
              await updateDoc(userDocRef, { downloadsLeft: increment(10) });
            }
            setPaymentType('Pack de 10 Imagens');
          } else if (packType === 'premium') {
            if (!userSnap.exists()) {
              await setDoc(userDocRef, { downloadsLeft: 0, isPremium: true });
            } else {
              await updateDoc(userDocRef, { isPremium: true });
            }
            setPaymentType('Acesso Premium Ilimitado');
          }

          setShowSuccessModal(true);
          window.history.replaceState({}, document.title, window.location.pathname);
          setIsVerifyingPayment(false);

        } catch (e) {
          console.error("Erro:", e);
          alert("Erro ao validar pagamento");
          setIsVerifyingPayment(false);
        }
      };
      
      processPayment();
    }

    return () => unsubscribe();
  }, [user]);

  // --- Image Processing Engine ---
  useEffect(() => {
    if (!imageSrc) return;
    setIsProcessing(true);
    
    const timer = setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        let w = gridSize;
        let h = Math.round((img.height / img.width) * gridSize);
        
        if (shape === 'hexagon') h = Math.round(h / (1.5 / Math.sqrt(3)));
        else if (shape === 'diamond') h = Math.round(h * 2);
        else if (shape === 'triangle') w = Math.round(w * 2);

        tempCanvas.width = w;
        tempCanvas.height = h;
        const ctx = tempCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, w, h);
        
        const imageData = ctx.getImageData(0, 0, w, h).data;
        const colorCounts = {};
        
        for (let i = 0; i < imageData.length; i += 4) {
          if (imageData[i + 3] < 128) continue; 
          const hex = rgbToHex(imageData[i], imageData[i + 1], imageData[i + 2]);
          colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }
        
        const sortedEntries = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
        const distinctColors = [];
        const MIN_DIST = 20; 

        for (const [hex] of sortedEntries) {
          if (distinctColors.length >= maxColors) break;
          const rgb = hexToRgb(hex);
          let isDifferent = true;
          for (const selectedHex of distinctColors) {
            const selectedRgb = hexToRgb(selectedHex);
            if (colorDistance(rgb, selectedRgb) < MIN_DIST) {
              isDifferent = false;
              break;
            }
          }
          if (isDifferent) distinctColors.push(hex);
        }

        if (distinctColors.length < maxColors) {
          for (const [hex] of sortedEntries) {
            if (distinctColors.length >= maxColors) break;
            if (!distinctColors.includes(hex)) distinctColors.push(hex);
          }
        }
        
        const baseNames = distinctColors.map(hex => getBaseColorName(hex));
        const finalPaletteNames = [];
        const nameTracker = {};
        
        baseNames.forEach(name => {
          if (nameTracker[name]) {
            nameTracker[name]++;
            const romans = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
            finalPaletteNames.push(`${name} ${romans[nameTracker[name]] || nameTracker[name]}`);
            if (nameTracker[name] === 2) {
              const firstIndex = finalPaletteNames.indexOf(name);
              if (firstIndex !== -1) finalPaletteNames[firstIndex] = `${name} I`;
            }
          } else {
            nameTracker[name] = 1;
            finalPaletteNames.push(name);
          }
        });
        
        const paletteRgb = distinctColors.map(hexToRgb);
        const grid = [];

        for (let y = 0; y < h; y++) {
          const row = [];
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (imageData[i+3] < 128) row.push(-1);
            else {
              const pixel = { r: imageData[i], g: imageData[i+1], b: imageData[i+2] };
              let closestIdx = 0; 
              let minDist = Infinity;
              paletteRgb.forEach((c, idx) => {
                const dist = colorDistance(pixel, c);
                if (dist < minDist) { minDist = dist; closestIdx = idx; }
              });
              row.push(closestIdx);
            }
          }
          grid.push(row);
        }
        
        setProcessedData({ grid, palette: distinctColors, paletteNames: finalPaletteNames, width: w, height: h, shape });
        setIsProcessing(false);
      };
      img.src = imageSrc;
    }, 150);
    return () => clearTimeout(timer);
  }, [imageSrc, gridSize, maxColors, shape]);

  // --- Rendering Engine ---
  const drawToCanvas = (ctx, customCellSize = null) => {
    if (processedData.grid.length === 0) return;
    const cellSize = customCellSize || Math.max(4, Math.floor(20 * (zoom / 100)));
    const currentShape = processedData.shape;
    const hexRadius = cellSize / Math.sqrt(3);
    const rowHeight = 1.5 * hexRadius;

    processedData.grid.forEach((row, y) => {
      row.forEach((colorIdx, x) => {
        if (colorIdx === -1) return;
        let cx, cy, posX, posY;
        if (currentShape === 'hexagon') {
          posX = x * cellSize + (y % 2 === 1 ? cellSize / 2 : 0); posY = y * rowHeight;
          cx = posX + cellSize / 2; cy = posY + hexRadius;
        } else if (currentShape === 'diamond') {
          posX = x * cellSize + (y % 2 === 1 ? cellSize / 2 : 0); posY = y * (cellSize / 2);
          cx = posX + cellSize / 2; cy = posY + cellSize / 2;
        } else if (currentShape === 'triangle') {
          posX = x * (cellSize / 2); posY = y * cellSize;
          cx = posX + cellSize / 2; cy = (x + y) % 2 === 0 ? posY + cellSize * 0.65 : posY + cellSize * 0.35;
        } else {
          posX = x * cellSize; posY = y * cellSize; cx = posX + cellSize / 2; cy = posY + cellSize / 2;
        }

        if (viewMode === 'color') {
          ctx.fillStyle = processedData.palette[colorIdx];
          if (currentShape === 'circle') { 
            ctx.beginPath(); ctx.arc(cx, cy, cellSize/2 * 0.9, 0, 2*Math.PI); ctx.fill(); 
          } else if (currentShape === 'hexagon') {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i + (Math.PI / 6);
              ctx.lineTo(cx + hexRadius * Math.cos(angle), cy + hexRadius * Math.sin(angle));
            }
            ctx.closePath(); ctx.fill();
          } else if (currentShape === 'triangle') {
            ctx.beginPath();
            if ((x+y)%2===0) { 
              ctx.moveTo(posX+cellSize/2, posY); ctx.lineTo(posX+cellSize, posY+cellSize); ctx.lineTo(posX, posY+cellSize); 
            } else { 
              ctx.moveTo(posX, posY); ctx.lineTo(posX+cellSize, posY); ctx.lineTo(posX+cellSize/2, posY+cellSize); 
            }
            ctx.closePath(); ctx.fill();
          } else if (currentShape === 'diamond') {
            ctx.beginPath(); ctx.moveTo(cx, cy - cellSize/2); ctx.lineTo(cx + cellSize/2, cy); ctx.lineTo(cx, cy + cellSize/2); ctx.lineTo(cx - cellSize/2, cy); ctx.closePath(); ctx.fill();
          } else {
            ctx.fillRect(posX, posY, cellSize, cellSize);
          }
        } else {
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#E5E7EB';
          ctx.lineWidth = 0.5;
          if (currentShape === 'square') { 
            ctx.fillRect(posX, posY, cellSize, cellSize); 
            ctx.strokeRect(posX, posY, cellSize, cellSize); 
          } else {
             ctx.beginPath();
             if (currentShape === 'circle') { ctx.arc(cx, cy, cellSize/2 * 0.9, 0, 2*Math.PI); }
             else if (currentShape === 'hexagon') {
               for (let i = 0; i < 6; i++) {
                 const a = (Math.PI/3)*i+(Math.PI/6); ctx.lineTo(cx+hexRadius*Math.cos(a), cy+hexRadius*Math.sin(a));
               }
             } else if (currentShape === 'triangle') {
               if((x+y)%2===0){ctx.moveTo(posX+cellSize/2,posY);ctx.lineTo(posX+cellSize,posY+cellSize);ctx.lineTo(posX,posY+cellSize);}
               else{ctx.moveTo(posX,posY);ctx.lineTo(posX+cellSize,posY);ctx.lineTo(posX+cellSize/2,posY+cellSize);}
             } else if (currentShape === 'diamond') {
               ctx.moveTo(cx, cy-cellSize/2); ctx.lineTo(cx+cellSize/2, cy); ctx.lineTo(cx, cy+cellSize/2); ctx.lineTo(cx-cellSize/2, cy);
             }
             ctx.closePath(); ctx.fill(); ctx.stroke();
          }
          ctx.fillStyle = '#9CA3AF';
          ctx.font = `${cellSize * 0.4}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(colorIdx + 1, cx, cy);
        }
      });
    });
  };

  useEffect(() => {
    if (!canvasRef.current || processedData.grid.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const cellSize = Math.max(4, Math.floor(20 * (zoom / 100)));
    
    if (processedData.shape === 'hexagon') {
      const hexRadius = cellSize / Math.sqrt(3);
      canvas.width = processedData.width * cellSize + cellSize / 2;
      canvas.height = processedData.height * (1.5 * hexRadius) + hexRadius / 2;
    } else if (processedData.shape === 'diamond') {
      canvas.width = processedData.width * cellSize + cellSize / 2;
      canvas.height = processedData.height * (cellSize / 2) + cellSize / 2;
    } else if (processedData.shape === 'triangle') {
      canvas.width = (processedData.width + 1) * (cellSize / 2);
      canvas.height = processedData.height * cellSize;
    } else {
      canvas.width = processedData.width * cellSize;
      canvas.height = processedData.height * cellSize;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawToCanvas(ctx);
    
    setCanvasSize({ width: canvas.width, height: canvas.height });
  }, [processedData, viewMode, zoom]);

  const handleCanvasAction = (e) => {
    if (!isEditing || !canvasRef.current) return;
    if (e.type === 'mousedown') setIsDrawing(true);
    if (e.type === 'mouseup' || e.type === 'mouseleave') setIsDrawing(false);
    if (!isDrawing && e.type !== 'mousedown') return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
    const cellSize = Math.max(4, Math.floor(20 * (zoom / 100)));
    
    let gridX, gridY;

    if (processedData.shape === 'hexagon') {
      const hexWidth = cellSize;
      const rowHeight = 1.5 * (cellSize / Math.sqrt(3));
      gridY = Math.floor(y / rowHeight);
      const offsetX = gridY % 2 === 1 ? hexWidth / 2 : 0;
      gridX = Math.floor((x - offsetX) / hexWidth);
    } else if (processedData.shape === 'diamond') {
      const rowHeight = cellSize / 2;
      gridY = Math.floor(y / rowHeight);
      const offsetX = gridY % 2 === 1 ? cellSize / 2 : 0;
      gridX = Math.floor((x - offsetX) / cellSize);
    } else if (processedData.shape === 'triangle') {
      let minDist = Infinity;
      const estX = Math.floor(x / (cellSize / 2));
      const estY = Math.floor(y / cellSize);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = estX + dx;
          const ny = estY + dy;
          if (ny >= 0 && ny < processedData.height && nx >= 0 && nx < processedData.width) {
             const isUp = (nx + ny) % 2 === 0;
             const cx = nx * (cellSize / 2) + cellSize / 2;
             const cy = isUp ? (ny * cellSize) + cellSize * 0.65 : (ny * cellSize) + cellSize * 0.35;
             const dist = Math.sqrt((x - cx)**2 + (y - cy)**2);
             if (dist < minDist) {
               minDist = dist;
               gridX = nx;
               gridY = ny;
             }
          }
        }
      }
    } else {
      gridX = Math.floor(x / cellSize);
      gridY = Math.floor(y / cellSize);
    }
    
    if (gridY >= 0 && gridY < processedData.height && gridX >= 0 && gridX < processedData.width) {
      if (processedData.grid[gridY][gridX] !== -1 && processedData.grid[gridY][gridX] !== activeColorIndex) {
        const newGrid = [...processedData.grid];
        newGrid[gridY] = [...newGrid[gridY]];
        newGrid[gridY][gridX] = activeColorIndex;
        setProcessedData({ ...processedData, grid: newGrid });
      }
    }
  };

  // --- Actions ---
  const handleLogin = async () => {
    if (!auth) {
      alert("Firebase is not connected! If you are deploying on Vercel, you MUST paste your Firebase keys into the 'fallbackConfig' inside App.jsx.");
      return;
    }
    try { 
      await signInWithPopup(auth, googleProvider); 
    } catch (e) { 
      console.warn("Popup blocked or failed, attempting redirect login...", e);
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectError) {
        alert("Sign in failed. Please check browser settings. Error: " + redirectError.message);
      }
    }
  };

  // 🔥 NOVA LÓGICA DE CHECKOUT API
  const createCheckout = async (type) => {
    try {
      if (!user || user.isAnonymous) {
        handleLogin();
        return;
      }

      // Comunica com o teu novo ficheiro api/create-checkout.js
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          type,
          email: user.email 
        })
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url; // Redireciona para o Stripe gerado
      } else {
        alert("Erro ao iniciar pagamento. Verifica as definições.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de comunicação ao ligar ao pagamento.");
    }
  };

  // 🔥 FIX: SAFE DECREASE CREDITS
  const safeDecreaseCredits = async () => {
    if (!user || !db) return;
    const userDocRef = doc(db, 'artifacts', sanitizedAppId, 'users', user.uid, 'profile', 'data');
    try {
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const current = userSnap.data().downloadsLeft || 0;
        if (current > 0) {
          await updateDoc(userDocRef, {
            downloadsLeft: increment(-1)
          });
        }
      }
    } catch (e) {
      console.error("Erro ao descontar crédito", e);
    }
  };

  const executeDownload = async () => {
    if (!user || user.isAnonymous) { handleLogin(); return; }
    if (!isAdmin && !isPremium && downloadsLeft <= 0) { setShowPaywall(true); return; }
    
    const link = document.createElement('a');
    link.download = `pixel-paint-${viewMode}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();

    if (!isAdmin && !isPremium) {
      await safeDecreaseCredits();
    }
  };

  const downloadPalette = async () => {
    if (!user || user.isAnonymous) { handleLogin(); return; }
    if (!isAdmin && !isPremium && downloadsLeft <= 0) { setShowPaywall(true); return; }
    if (processedData.palette.length === 0) return;

    const offCanvas = document.createElement('canvas');
    const ctx = offCanvas.getContext('2d');
    const paperW = 2550, paperH = 3300;
    offCanvas.width = paperW; offCanvas.height = paperH;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, paperW, paperH);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 80px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Color Palette', paperW / 2, 300);

    const padding = 200, paletteStartY = 500, paletteBoxSize = 90, gapX = 400, gapY = 80;
    const itemWidth = paletteBoxSize + gapX;
    const cols = Math.floor((paperW - padding * 2) / itemWidth);
    const startX = (paperW - (Math.min(processedData.palette.length, cols) * itemWidth)) / 2;

    ctx.translate(startX, paletteStartY);
    processedData.palette.forEach((color, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const px = col * itemWidth, py = row * (paletteBoxSize + gapY);
      
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(px, py, paletteBoxSize, paletteBoxSize, 12); ctx.fill();
      ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 4; ctx.stroke();
      
      ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 8;
      ctx.font = `bold 40px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(i + 1, px + paletteBoxSize / 2, py + paletteBoxSize / 2);
      
      ctx.shadowBlur = 0; ctx.fillStyle = '#111827'; ctx.font = `bold 36px sans-serif`; ctx.textAlign = 'left';
      ctx.fillText(processedData.paletteNames[i], px + paletteBoxSize + 40, py + paletteBoxSize / 2);
    });
    
    const link = document.createElement('a'); link.download = `PixelPaintPro_Palette.png`; link.href = offCanvas.toDataURL('image/png'); link.click();

    if (!isAdmin && !isPremium) {
      await safeDecreaseCredits();
    }
  };

  const handlePromoCode = async () => {
    const code = promoCode.toUpperCase();
    const authorizedEmail = PROMO_CODES[code];

    if (!user || user.isAnonymous) {
      alert("Please Sign In first to apply the promo code to your account.");
      return;
    }

    if (authorizedEmail && authorizedEmail.toLowerCase() === user.email.toLowerCase()) {
      try {
        const userDocRef = doc(db, 'artifacts', sanitizedAppId, 'users', user.uid, 'profile', 'data');
        await updateDoc(userDocRef, { isPremium: true });
        alert("Promo code accepted! Unlimited Access unlocked.");
        setShowPromoInput(false);
        setShowPaywall(false);
      } catch (error) {
        console.error("Error applying promo code:", error);
      }
    } else if (authorizedEmail) {
      alert("This promo code is not authorized for this email address.");
    } else {
      alert("Invalid promo code.");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50 text-indigo-600"><RefreshCw className="animate-spin w-8 h-8" /></div>;

  return (
    <div className="flex h-screen bg-[#F3F4F6] font-sans text-gray-800 relative overflow-hidden">
      
      {/* OVERLAY DE VALIDAÇÃO DE PAGAMENTO */}
      {isVerifyingPayment && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[110] flex flex-col items-center justify-center">
           <RefreshCw className="animate-spin w-12 h-12 text-indigo-600 mb-4" />
           <p className="text-xl font-black text-slate-800">A validar pagamento seguro...</p>
           <p className="text-sm text-slate-500">Isto demora apenas alguns segundos.</p>
        </div>
      )}

      {/* IN-APP BROWSER WARNING (TikTok/Instagram) */}
      {isInAppBrowser && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-400 text-yellow-900 px-4 py-2 text-xs font-bold text-center z-50 flex items-center justify-center shadow-md">
          <AlertCircle className="w-4 h-4 mr-2" />
          <span>You are using an app browser. To Sign In with Google, tap the 3 dots (...) and choose "Open in System Browser".</span>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-[340px] bg-white border-r border-gray-200 flex flex-col shadow-sm z-10 shrink-0">
        
        <div className="p-6 pb-4">
          <div className="flex items-center space-x-3 text-indigo-600 mb-6">
            <Palette className="w-8 h-8 text-indigo-500" />
            <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-500 tracking-tight">Pixel Paint Pro</h1>
          </div>
          
          <button onClick={() => fileInputRef.current.click()} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center space-x-2 shadow-md">
            <Upload className="w-5 h-5" /> <span>Upload Image</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => {
            const f = e.target.files[0];
            if(f){ setImageName(f.name); const r = new FileReader(); r.onload=(ev)=>setImageSrc(ev.target.result); r.readAsDataURL(f); }
          }} className="hidden" />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          <section>
             <h3 className="flex items-center text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">
               <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> Book Size <span className="font-normal text-gray-400 ml-1 lowercase tracking-normal">(inches)</span>
             </h3>
             <div className="grid grid-cols-3 gap-2">
               {['8.5×11', '8×10', '8.5×8.5'].map(size => (
                 <button key={size} onClick={() => setBookSize(size)} className={`py-2 text-[12px] border rounded-lg font-bold transition-all ${bookSize === size ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{size}</button>
               ))}
             </div>
          </section>

          <section>
            <h3 className="flex items-center text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> Image
            </h3>
            {imageSrc ? (
              <div className="flex items-center justify-between border border-gray-200 rounded-lg p-3 bg-gray-50 shadow-sm">
                <span className="text-xs text-gray-600 truncate mr-2 font-medium" title={imageName}>{imageName}</span>
                <button onClick={handleReset} className="text-red-400 hover:text-red-600 transition p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="text-xs text-gray-400 italic px-2">No image uploaded</div>
            )}
          </section>

          <section>
            <h3 className="flex items-center text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> Grid Detail
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[62, 50, 37].map(val => (
                <button key={val} onClick={() => setGridSize(val)} className={`py-2.5 border rounded-lg transition flex flex-col items-center justify-center ${gridSize === val ? 'border-indigo-600 bg-indigo-50 shadow-sm ring-1 ring-indigo-600' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <span className={`text-[12px] font-bold ${gridSize === val ? 'text-indigo-700' : 'text-gray-700'}`}>{val === 62 ? 'High' : val === 50 ? 'Medium' : 'Simple'}</span>
                  <span className={`text-[10px] mt-0.5 ${gridSize === val ? 'text-indigo-500' : 'text-gray-400'}`}>{val}×{val}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="flex items-center text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> Piece Shape
            </h3>
            <div className="relative">
              <select value={shape} onChange={(e) => setShape(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer appearance-none bg-white shadow-sm">
                <option value="square">Squares</option>
                <option value="hexagon">Hexagons</option>
                <option value="diamond">Diamonds</option>
                <option value="circle">Circles</option>
                <option value="triangle">Triangles</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </section>

          <section>
            <h3 className="flex items-center text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> Number of Colors
            </h3>
            <div className="relative">
              <select value={maxColors} onChange={(e) => setMaxColors(Number(e.target.value))} className="w-full p-3 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer appearance-none bg-white shadow-sm">
                {[12, 16, 24, 32].map(num => <option key={num} value={num}>{num} Colors</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </section>

          {/* DETAILED PALETTE LIST */}
          {processedData.palette.length > 0 && (
            <section className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Color Map</h3>
                <span className="text-[10px] font-bold text-gray-400">{processedData.palette.length} Colors</span>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {processedData.palette.map((color, i) => (
                  <div key={i} onClick={() => isEditing && setActiveColorIndex(i)} className={`flex items-center text-xs p-1.5 rounded-lg cursor-pointer transition-all ${activeColorIndex === i && isEditing ? 'bg-indigo-50 ring-2 ring-indigo-400 shadow-sm' : 'hover:bg-gray-100 border border-transparent hover:border-gray-200'}`}>
                    <span className="w-6 h-6 bg-gray-900 text-white rounded flex items-center justify-center text-[10px] mr-3 font-bold shadow-sm shrink-0">{i+1}</span>
                    <div className="w-6 h-6 rounded-md border border-gray-200 shadow-sm mr-3 shrink-0" style={{ backgroundColor: color }}></div>
                    <span className="truncate flex-1 font-medium text-gray-700 text-sm">{processedData.paletteNames[i]}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* BOTTOM USER PROFILE */}
        <div className="p-6 bg-white border-t border-gray-200 shrink-0">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100 overflow-hidden shadow-sm">
                  {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" alt="" /> : <User className="text-indigo-600 w-5 h-5"/>}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate w-28 text-gray-800">{user.displayName || 'User'}</p>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{isAdmin || isPremium ? 'Premium' : `${downloadsLeft} Credits`}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  handleReset(); // Limpa o quadro ao sair da conta
                  signOut(auth);
                }} 
                className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                title="Terminar Sessão"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button onClick={handleLogin} className="w-full border-2 border-indigo-600 text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors">
              Sign in with Google
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-[#F3F4F6] pt-8">
        
        {/* TOP HEADER */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 z-10 shadow-sm">
          <div className="flex items-center space-x-4">
            
            {imageSrc && processedData.grid.length > 0 && (
              <button 
                onClick={() => setShowOriginal(!showOriginal)} 
                className={`mr-2 flex items-center justify-center w-10 h-10 rounded-xl transition-all overflow-hidden p-0 border-2 ${showOriginal ? 'border-indigo-500 shadow-md scale-105' : 'border-transparent hover:border-indigo-300'}`}
                title="Toggle Original Image"
              >
                <img src={imageSrc} className="w-full h-full object-cover" alt="Original Thumb" />
              </button>
            )}
            
            <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200">
              <button onClick={() => setViewMode('color')} className={`px-6 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'color' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>View Color</button>
              <button onClick={() => setViewMode('number')} className={`px-6 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'number' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>View Numbers</button>
              <button onClick={downloadPalette} disabled={!imageSrc || processedData.grid.length === 0} className="px-6 py-1.5 text-sm font-bold rounded-lg transition-all text-teal-600 hover:bg-teal-50 disabled:opacity-50 flex items-center border border-transparent hover:border-teal-200"><Download className="w-4 h-4 mr-2"/> Download Palette</button>
            </div>
            
            {processedData.grid.length > 0 && (
              <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center px-5 py-2 rounded-xl border font-bold text-sm transition-all ml-2 shadow-sm ${isEditing ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                <Pencil className="w-4 h-4 mr-2" /> Pencil {isEditing ? 'ON' : 'OFF'}
              </button>
            )}
          </div>

          <div className="flex items-center space-x-5">
            <div className="flex items-center bg-white border border-gray-200 rounded-xl px-2 shadow-sm py-1">
              <button onClick={() => setZoom(z => Math.max(20, z - 10))} className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-sm font-bold w-16 text-center text-gray-800">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(300, z + 10))} className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"><ZoomIn className="w-4 h-4" /></button>
            </div>
            <button onClick={executeDownload} disabled={!imageSrc || processedData.grid.length===0} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-lg flex items-center space-x-2 transition-transform hover:scale-[1.02]">
              <Download className="w-5 h-5" /> <span>Download ({bookSize})</span>
            </button>
          </div>
        </header>

        {/* TOP PALETTE BAR */}
        {processedData.palette.length > 0 && (
          <div className="bg-white border-b border-gray-200 px-8 py-4 flex flex-wrap gap-2 justify-center shrink-0 shadow-sm z-0">
            {processedData.palette.map((color, i) => (
              <button 
                key={i} 
                onClick={() => isEditing && setActiveColorIndex(i)} 
                className={`flex items-center justify-center w-9 h-9 rounded-lg text-[11px] font-bold shadow-sm transition-all ${isEditing ? 'cursor-pointer hover:scale-110' : 'cursor-default'} ${isEditing && activeColorIndex === i ? 'ring-4 ring-indigo-500 scale-110 z-10' : 'border border-gray-200'}`} 
                style={{ backgroundColor: color, color: getContrastYIQ(color) }}
                title={processedData.paletteNames[i]}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}

        {/* CANVAS AREA WITH ORIGINAL PREVIEW SIDE-BY-SIDE */}
        <div className="flex-1 overflow-auto p-12 flex flex-row items-start justify-center gap-8 relative pattern-bg" style={{backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
          {!imageSrc ? (
            <div className="text-center bg-white p-16 rounded-[2.5rem] shadow-2xl max-w-lg border border-gray-100 transform mt-10">
              <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner"><ImageIcon className="w-12 h-12" /></div>
              <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Paint by Numbers</h2>
              <p className="text-gray-500 mb-8 font-medium text-lg leading-relaxed">Upload a photo from the sidebar to generate a custom paint-by-numbers template.</p>
              <button onClick={() => fileInputRef.current.click()} className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl hover:shadow-indigo-200 hover:-translate-y-1">Upload Image</button>
            </div>
          ) : (
            <>
              {showOriginal && canvasSize.width > 0 && (
                <div className="relative bg-white p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-xl border border-gray-200 shrink-0 flex flex-col items-center">
                  <img src={imageSrc} alt="Original Reference" className="object-contain rounded border border-gray-100" style={{ width: `${canvasSize.width * 0.5}px`, maxHeight: '75vh' }} />
                  <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest">Original Reference</p>
                </div>
              )}

              <div 
                className="relative bg-white p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-xl border border-gray-200 shrink-0"
                style={{ cursor: isEditing && processedData.palette.length > 0 ? getPencilCursor(processedData.palette[activeColorIndex]) : 'default' }}
              >
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-xl">
                    <RefreshCw className="animate-spin w-12 h-12 text-indigo-600 mb-4" />
                    <p className="text-sm font-black text-indigo-600 uppercase tracking-widest">Processing Pixels...</p>
                  </div>
                )}
                <canvas 
                  ref={canvasRef} 
                  onMouseDown={handleCanvasAction} 
                  onMouseMove={handleCanvasAction} 
                  onMouseUp={handleCanvasAction} 
                  onMouseLeave={handleCanvasAction} 
                  className="max-w-full h-auto" 
                />
              </div>
            </>
          )}
        </div>
      </main>

      {/* MENSAGEM DE AGRADECIMENTO (MODAL DE SUCESSO) */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] max-w-md w-full p-10 text-center shadow-2xl transform animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <PartyPopper className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Muito Obrigado! 🥳</h2>
            <p className="text-slate-500 font-medium mb-8">
              O teu pagamento foi processado com sucesso. O teu plano <span className="text-indigo-600 font-bold">{paymentType}</span> já está ativo na tua conta!
            </p>
            <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
               <div className="flex items-center justify-center space-x-2 text-green-600 font-bold">
                 <CheckCircle2 className="w-5 h-5" />
                 <span>Créditos Atualizados (Guardados para sempre!)</span>
               </div>
            </div>
            <button 
              onClick={() => setShowSuccessModal(false)} 
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg"
            >
              Começar a Pintar
            </button>
          </div>
        </div>
      )}

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-xl w-full overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-300">
            <div className="p-12 text-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white relative">
              <div className="absolute top-6 right-6">
                <button onClick={() => setShowPaywall(false)} className="text-white/50 hover:text-white transition-colors">
                  <Trash2 className="w-6 h-6" />
                </button>
              </div>
              <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-4xl font-black mb-3 tracking-tight">Unlock Downloads</h2>
              <p className="text-indigo-100 text-sm font-medium leading-relaxed max-w-xs mx-auto">Choose a plan to export your professional paint-by-numbers images.</p>
            </div>
            <div className="p-10 space-y-4 bg-gray-50">
              
              <button 
                onClick={() => {
                  setShowPaywall(false);
                  createCheckout('10');
                }}
                className="w-full flex items-center justify-between p-6 bg-white rounded-[2rem] border-2 border-transparent hover:border-indigo-600 transition-all shadow-sm hover:shadow-md group text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 text-lg">10 Image Pack</h4>
                    <p className="text-sm text-gray-500 font-medium">$5.99 - One-time purchase</p>
                  </div>
                </div>
                <div className="text-indigo-600 font-black text-2xl">$5.99</div>
              </button>
              
              <button 
                onClick={() => {
                  setShowPaywall(false);
                  createCheckout('premium');
                }}
                className="w-full flex items-center justify-between p-6 bg-indigo-600 text-white rounded-[2rem] border-2 border-indigo-500 transition-all shadow-xl hover:shadow-indigo-200 transform hover:scale-[1.02] group text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                    <Star className="w-6 h-6 fill-current" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg">Unlimited Access</h4>
                    <p className="text-sm text-white/70 font-medium">Forever Access - All features</p>
                  </div>
                </div>
                <div className="font-black text-2xl">$49.99</div>
              </button>

              <div className="mt-4 pt-4 border-t border-gray-200">
                {!showPromoInput ? (
                  <button onClick={() => setShowPromoInput(true)} className="text-xs text-indigo-600 font-bold uppercase hover:underline flex items-center justify-center w-full">
                    Have a promo code?
                  </button>
                ) : (
                  <div className="flex items-center space-x-2 mt-2">
                    <input 
                      type="text" 
                      value={promoCode} 
                      onChange={(e) => setPromoCode(e.target.value)} 
                      placeholder="Enter code" 
                      className="flex-1 p-3 border border-gray-300 rounded-lg text-sm font-bold uppercase focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                    <button onClick={handlePromoCode} className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition-colors">
                      Apply
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest mt-4"> Secure payment via Stripe </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}