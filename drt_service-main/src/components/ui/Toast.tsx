import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({
  message,
  type,
  isVisible,
  onClose,
  duration = 3000,
}: ToastProps) {
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // 1. 다음 틱(10ms)으로 한 박자 늦춰서 동기 리렌더링 방지 & 슬라이드 애니메이션 트리거
      const enterTimer = setTimeout(() => {
        setIsShowing(true);
      }, 10);

      // 2. duration 후 닫힘 애니메이션
      const exitTimer = setTimeout(() => {
        setIsShowing(false);
        setTimeout(onClose, 300); // 300ms 페이드아웃 후 부모 언마운트
      }, duration);

      return () => {
        clearTimeout(enterTimer);
        clearTimeout(exitTimer);
      };
    }
  }, [isVisible, duration, onClose]);


  if (!isVisible) return null;

  const baseClasses =
    "fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300";
  const typeClasses = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    info: "bg-blue-500 text-white",
  };

  return (
    <div
      className={`${baseClasses} ${typeClasses[type]} ${isShowing ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}>
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button
          onClick={() => {
            setIsShowing(false);
            setTimeout(onClose, 300);
          }}
          className="ml-4 text-white hover:text-gray-200 text-lg font-bold">
          ×
        </button>
      </div>
    </div>
  );
}
