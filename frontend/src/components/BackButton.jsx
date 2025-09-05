import React from "react";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "../lib/utils";

export default function BackButton({ 
  onBack, 
  canGoBack = false, 
  className = "", 
  variant = "ghost", 
  size = "sm",
  showText = false,
  text = "Назад",
  disabled = false 
}) {
  if (!canGoBack && !onBack) return null;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onBack && typeof onBack === 'function') {
      onBack();
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || (!canGoBack && !onBack)}
      className={cn(
        "flex items-center gap-1 transition-all duration-200",
        "hover:scale-105 active:scale-95",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-accent/80",
        className
      )}
      aria-label="Вернуться на предыдущий экран"
    >
      <ArrowLeft className="w-4 h-4" />
      {showText && <span className="hidden sm:inline">{text}</span>}
    </Button>
  );
}