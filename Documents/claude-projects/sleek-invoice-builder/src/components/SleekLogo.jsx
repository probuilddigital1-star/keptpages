export default function SleekLogo({ showText = true, size = 'default', onClick }) {
  const sizes = {
    small: { icon: 32, text: 14 },
    default: { icon: 40, text: 16 },
    large: { icon: 48, text: 18 }
  };
  
  const { icon: iconSize, text: textSize } = sizes[size] || sizes.default;
  
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
      aria-label="Go to Dashboard"
    >
      {/* Document Icon with S */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Document shape with folded corner */}
        <path
          d="M8 4C8 2.89543 8.89543 2 10 2H30L40 12V44C40 45.1046 39.1046 46 38 46H10C8.89543 46 8 45.1046 8 44V4Z"
          fill="url(#gradient-blue)"
        />
        
        {/* Folded corner */}
        <path
          d="M30 2L40 12H32C30.8954 12 30 11.1046 30 10V2Z"
          fill="#1E6FFF"
          opacity="0.8"
        />
        
        {/* Letter S */}
        <path
          d="M24 14C19.5 14 16 15.5 16 18.5C16 21 18 22 20 22.5L24 23.5C26 24 28 25 28 27.5C28 30.5 24.5 32 20 32M24 14C26.5 14 28 15 28 16.5M20 32C17.5 32 16 31 16 29.5"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient-blue" x1="8" y1="2" x2="40" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3B82F6" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Text */}
      {showText && (
        <div className="flex flex-col items-start">
          <span 
            className="font-bold text-blue-600 dark:text-blue-500 leading-tight"
            style={{ fontSize: `${textSize}px` }}
          >
            Sleek Invoice
          </span>
        </div>
      )}
    </button>
  );
}