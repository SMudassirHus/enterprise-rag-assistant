function LoadingButton({
  children,
  className = "",
  disabled = false,
  isLoading = false,
  loadingLabel,
  ...props
}) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? loadingLabel : children}
    </button>
  );
}

export default LoadingButton;
