// Sao chép file này thành js/firebase-config.js rồi điền cấu hình Web App của Firebase project CỦA BẠN
// (Firebase Console -> Project settings -> Your apps -> Web app -> Config). Web API key không phải bí mật,
// nhưng phải giới hạn domain/API trong Google Cloud Console và bật App Check (xem docs/guides/DEPLOYMENT_AND_HANDOVER.md).
window.TKBC_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
// Region Cloud Functions nằm ở src/config/functionsConfig.js và functions/lib/config.js (phải trùng nhau).
// Chạy với Emulator trên localhost: không cần file js/firebase-config.js; mở http://127.0.0.1:5000 (xem docs/guides/LOCAL_DEVELOPMENT.md).
