// Điểm vào của ứng dụng. THỨ TỰ import rất quan trọng: firebase phải khởi tạo trước, âm thanh (listener toàn cục) trước React.
import './config/firebase.js';
import './lib/audio.js';
import { ThienKieuApp } from './App.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ThienKieuApp />);
