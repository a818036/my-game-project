interface EndingChoiceProps {
  value: string;
  disabled?: boolean;
  onChange(value: string): void;
  onChoose(): void;
}

export function EndingChoice({ value, disabled = false, onChange, onChoose }: EndingChoiceProps) {
  return <div className="ending-choice">
    <label htmlFor="ending-direction">你決定的結局方向</label>
    <input
      id="ending-direction"
      value={value}
      maxLength={80}
      placeholder="例如：歸隱故里、安頓家人後巡行天下"
      onChange={(event) => onChange(event.currentTarget.value)}
      disabled={disabled}
    />
    <p className="caption">只有按下確認才會記錄你的結局選擇；留白或繼續人生都不會結束這條世界線。</p>
    <button className="primary" disabled={disabled || !value.trim()} onClick={onChoose}>確認選擇結局</button>
  </div>;
}
