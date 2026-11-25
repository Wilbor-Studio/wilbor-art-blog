import { useEffect, useState } from 'react';

export function IconX({
  size = 40,
  className = "",
  lineColor,
}: {
  size?: number;
  className?: string;
  /** Cor fixa do X. Sem ela, branco no tema claro e preto no escuro. */
  lineColor?: string;
}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
  }, []);

  const stroke = lineColor ?? (isDark ? 'black' : '#fff');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="20" cy="20" r="20" fill={ '#626262'} />
      <line x1="13" y1="13" x2="27" y2="27" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="27" y1="13" x2="13" y2="27" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
