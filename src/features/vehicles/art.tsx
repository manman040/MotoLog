export function VehicleArt({ type = "motorcycle" }: { type?: string }) {
  return (
    <div className="vehicle-art">
      <span className="vehicle-type badge violet">
        {type === "car" ? "CAR" : "MOTORCYCLE"}
      </span>
      {type === "car" ? (
        <svg
          viewBox="0 0 600 230"
          role="img"
          aria-label="Stylized car illustration"
        >
          <defs>
            <linearGradient id="carPaint" x2="0" y2="1">
              <stop stopColor="#77738b" />
              <stop offset=".45" stopColor="#393746" />
              <stop offset="1" stopColor="#1b1b24" />
            </linearGradient>
          </defs>
          <ellipse
            cx="310"
            cy="188"
            rx="215"
            ry="13"
            fill="#07070a"
            opacity=".6"
          />
          <path
            d="M87 151 114 126 209 110 258 67 375 69 430 113 493 128 515 160 503 178 96 178Z"
            fill="url(#carPaint)"
            stroke="#8d869d"
            strokeWidth="1.5"
          />
          <path
            d="m225 111 43-35 100 2 44 35Z"
            fill="#151722"
            stroke="#6e687e"
          />
          <path
            d="m310 78-3 34M416 121l-2 43M219 120l-4 44"
            stroke="#777085"
            strokeWidth="1.2"
          />
          <path
            d="m111 135 63-9-9 13-57 6M454 130l42 7 9 10-48-5"
            fill="#c6c3dc"
          />
          <path
            d="m103 163 77-4M454 162l48 2"
            stroke="#08080c"
            strokeWidth="8"
          />
          <g fill="#0c0c12" stroke="#5c586a" strokeWidth="4">
            <circle cx="193" cy="173" r="32" />
            <circle cx="425" cy="173" r="32" />
          </g>
          <g fill="#5f5a70" stroke="#a6a0b5" strokeWidth="1">
            <circle cx="193" cy="173" r="19" />
            <circle cx="425" cy="173" r="19" />
          </g>
          <path
            d="M189 159v28m-10-15h28m214-14v29m-11-15h28"
            stroke="#23212b"
            strokeWidth="4"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 600 230"
          role="img"
          aria-label="Stylized motorcycle illustration"
        >
          <defs>
            <linearGradient id="bikePaint" x2=".7" y2="1">
              <stop stopColor="#a09aa9" />
              <stop offset=".4" stopColor="#5d586b" />
              <stop offset="1" stopColor="#24212f" />
            </linearGradient>
          </defs>
          <ellipse
            cx="310"
            cy="196"
            rx="194"
            ry="10"
            fill="#060609"
            opacity=".7"
          />
          <g fill="#101015" stroke="#55515f" strokeWidth="5">
            <circle cx="177" cy="164" r="45" />
            <circle cx="426" cy="164" r="45" />
          </g>
          <g fill="none" stroke="#b2a9c0" strokeWidth="2">
            <circle cx="177" cy="164" r="30" />
            <circle cx="426" cy="164" r="30" />
          </g>
          <path
            d="m176 163 89-7 75-51 83 59M270 152l-34-54 133 9"
            fill="none"
            stroke="#7a728a"
            strokeWidth="8"
          />
          <path
            d="m426 164-38-91-17-29-36-6"
            fill="none"
            stroke="#ada3b9"
            strokeWidth="7"
          />
          <path
            d="m233 99 53-23 70 9 26 27-57 21-60-2Z"
            fill="url(#bikePaint)"
            stroke="#9d93ad"
            strokeWidth="1.5"
          />
          <path
            d="m276 77 12-25 52 1 22 29"
            fill="url(#bikePaint)"
            stroke="#8b819e"
          />
          <path
            d="m187 83 67-6 35 9-12 14-67-1Z"
            fill="#14131b"
            stroke="#625a73"
            strokeWidth="3"
          />
          <path d="m184 82-29-12-25 2 16 13 49 14" fill="#5c536c" />
          <path
            d="m253 136 58-7 22 28-28 25-49-7-11-21Z"
            fill="#24212e"
            stroke="#81768f"
            strokeWidth="2"
          />
          <path
            d="m257 145 53-3m-49 12 54-1m-48 11 41 1"
            stroke="#6f657d"
            strokeWidth="3"
          />
          <path
            d="m286 181-76 4-49-12"
            fill="none"
            stroke="#8e839e"
            strokeWidth="10"
          />
          <path
            d="m398 91 24-6-8-22-24 3Z"
            fill="#d9d3ed"
            stroke="#786d88"
            strokeWidth="3"
          />
          <path d="m382 49 7-25m-3 0h-22" stroke="#898096" strokeWidth="3" />
          <path
            d="M144 119q29-21 61 0m192-4q27-17 52 8"
            fill="none"
            stroke="#5c526c"
            strokeWidth="9"
          />
          <circle cx="177" cy="164" r="8" fill="#9990a6" />
          <circle cx="426" cy="164" r="8" fill="#9990a6" />
        </svg>
      )}
      <span className="art-caption">MOTOLOG / GARAGE ILLUSTRATION</span>
    </div>
  );
}
