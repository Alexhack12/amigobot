import "../styles/emotionbar.css";

function EmotionBar({ label, value }) {
  return (
    <div className="emotion-bar">
      <div className="emotion-info">
        <span>{label}</span>
        <span>{value}%</span>
      </div>

      <div className="emotion-track">
        <div className="emotion-fill" style={{ width: `${value}%` }}></div>
      </div>
    </div>
  );
}

export default EmotionBar;