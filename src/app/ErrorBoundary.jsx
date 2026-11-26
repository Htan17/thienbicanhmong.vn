// Khung bắt lỗi render: một lỗi bất ngờ (kể cả do mất mạng giữa chừng) không còn làm trắng màn hình
// mà hiện thông báo thân thiện + nút tải lại.
export class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { failed: false }; }
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(err) { try { console.warn('[TKBC] Lỗi giao diện:', err); } catch (e) {} }
    render() {
        if (!this.state.failed) return this.props.children;
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        const box = { minHeight: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', padding: 24, boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif' };
        const card = { maxWidth: 340, width: '100%', textAlign: 'center', border: '1px solid #3f3f46', borderRadius: 14, background: '#18181b', padding: 22, color: '#e4e4e7' };
        const btn = { marginTop: 16, width: '100%', background: '#eab308', color: '#000', border: 'none', borderRadius: 10, padding: '11px 14px', fontWeight: 900, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' };
        return React.createElement('div', { style: box },
            React.createElement('div', { style: card },
                React.createElement('h2', { style: { margin: 0, fontSize: 17, color: '#facc15' } }, offline ? 'Đang ngoại tuyến' : 'Có lỗi xảy ra'),
                React.createElement('p', { style: { fontSize: 13, lineHeight: 1.6, color: '#a1a1aa', margin: '10px 0 0' } }, offline ? 'Mất kết nối mạng nên ứng dụng tạm dừng. Hãy kiểm tra mạng rồi tải lại.' : 'Ứng dụng gặp sự cố ngoài ý muốn. Dữ liệu đã lưu của bạn không bị ảnh hưởng. Hãy tải lại trang.'),
                React.createElement('button', { style: btn, onClick: () => window.location.reload() }, 'Tải lại')));
    }
}
