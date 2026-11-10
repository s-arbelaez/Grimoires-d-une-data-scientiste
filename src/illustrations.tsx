import type { CSSProperties } from "react";

export function BatIllustration({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <svg className={className} style={style} viewBox="0 0 400 240" aria-hidden="true" focusable="false">
    <g className="bat-wing-root bat-wing-left" transform="translate(200 111) scale(-1 1)"><g className="bat-wing-flap">
      <path className="engraving-fill" d="M0 0C18-22 31-55 62-80 56-57 62-42 72-38 88-58 105-75 125-86 116-63 116-47 129-41 150-57 166-69 190-75 178-48 175-31 188-18 164 3 143 8 118-4 100 18 77 25 51 14 30 31 12 35 0 25Z" />
      <path className="engraving-lines" d="M2 4C29-17 48-49 62-80M4 8C36-10 58-29 72-38M5 10c39-11 83-34 120-96M8 13c55-3 116-45 182-88M14 16C65 13 116-1 188-18M15 17c39 15 72 12 103-21M27 21c24 20 61 19 91-25" />
    </g></g>
    <g className="bat-wing-root bat-wing-right" transform="translate(200 111)"><g className="bat-wing-flap">
      <path className="engraving-fill" d="M0 0C18-22 31-55 62-80 56-57 62-42 72-38 88-58 105-75 125-86 116-63 116-47 129-41 150-57 166-69 190-75 178-48 175-31 188-18 164 3 143 8 118-4 100 18 77 25 51 14 30 31 12 35 0 25Z" />
      <path className="engraving-lines" d="M2 4C29-17 48-49 62-80M4 8C36-10 58-29 72-38M5 10c39-11 83-34 120-96M8 13c55-3 116-45 182-88M14 16C65 13 116-1 188-18M15 17c39 15 72 12 103-21M27 21c24 20 61 19 91-25" />
    </g></g>
    <g className="engraving-fill bat-body">
      <path d="M183 100 177 72l19 15 4-24 4 24 19-15-6 28-9 16h-16Z" />
      <path d="M184 109c-8 13-7 34 1 45l15 13 15-13c8-11 9-32 1-45l-8-8h-16Z" />
      <path d="M188 161c-1 12-6 21-12 27 9 1 18-4 24-13 6 9 15 14 24 13-6-6-11-15-12-27l-12-8Z" />
      <path className="engraving-accent" d="m190 109 4 5-2 7m18-12-4 5 2 7" />
    </g>
    <g className="engraving-lines">
      <path d="M179 90c-8-5-15-13-21-21m63 21c8-5 15-13 21-21M188 132c7 5 17 5 24 0m-13-19v15m-4 15 4 3 4-3m-12 20-8 13m24-13 8 13" />
      <path d="M157 66c-13-9-21-19-27-33m27 33-10-2m10 2-1-10m99 10c13-9 21-19 27-33m-27 33 10-2m-10 2 1-10" />
    </g>
  </svg>;
}

export function RoseIllustration({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 120 190" aria-hidden="true" focusable="false">
    <path className="engraving-fill rose-petal" d="M58 79C47 85 34 78 32 68 20 61 23 48 36 42c1-14 14-21 25-11 9-11 23-5 24 9 14 4 18 17 8 27-4 14-18 20-31 13Z" />
    <path className="rose-leaf-engraving" d="M58 124c-14-17-28-24-44-21 9 14 22 22 43 26Zm7 13c13-18 27-25 43-24-8 15-22 24-42 29Z" />
    <g className="engraving-lines">
      <path d="M58 102c-2 30 1 57 7 81m-4-47c-13-17-28-24-44-21 9 13 22 22 43 26m4 13c12-17 27-24 43-23-8 15-22 24-42 28m-5-23-18-12m23 24 18-14m-25 32-12 1m17 6 15-4" />
      <path d="M58 73c-14-4-23-17-21-31 1-9 8-16 16-19 1 10 7 14 14 18 10 5 17 15 15 26-2 13-13 20-27 19-15-1-26-10-27-22m33 9c-10-7-12-18-7-27m-6 28c-6-8-6-17-1-25m24 25c9-7 12-16 8-25M51 37c-2-7 1-13 7-17m6 22c1-8 6-14 13-16m-26 24c8-5 17-6 25-2m-29 10c9-5 18-4 27 0m-22 9c8-3 15-2 22 2m-16-21c4 7 10 12 18 14m-31-1c4 8 12 13 22 14" />
      <path d="M43 40c-8-8-16-10-24-7 4 9 10 15 19 18m46-11c8-8 16-10 24-7-4 9-10 15-19 18" />
      <path className="engraving-accent" d="M58 44c3-7 10-8 15-4m-23 14c5 7 12 10 21 10m-9 42-7 9-8-10m27 12 8 9 10-11" />
    </g>
  </svg>;
}

export function CathedralArch() {
  return <svg className="hero-arch" viewBox="0 0 540 650" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="arch-velvet" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#21152d" />
        <stop offset=".52" stopColor="#120d1a" />
        <stop offset="1" stopColor="#21162a" />
      </linearGradient>
      <pattern id="arch-damask" width="46" height="58" patternUnits="userSpaceOnUse">
        <path d="M23 3c-3 10-10 13-10 23 0 7 5 11 10 15 5-4 10-8 10-15 0-10-7-13-10-23Zm0 38v13m-8-23c4 1 6 4 8 8 2-4 4-7 8-8" fill="none" stroke="#c7a8db" strokeOpacity=".055" strokeWidth="1" />
      </pattern>
      <pattern id="arch-lace" width="34" height="34" patternUnits="userSpaceOnUse">
        <path d="M17 1C14 7 9 11 2 17c7 6 12 10 15 16 3-6 8-10 15-16C25 11 20 7 17 1Z" fill="none" stroke="#ddc8d8" strokeOpacity=".48" strokeWidth=".8" />
        <path d="M17 7C15 12 12 15 7 17c5 2 8 5 10 10 2-5 5-8 10-10-5-2-8-5-10-10Z" fill="none" stroke="#ddc8d8" strokeOpacity=".42" strokeWidth=".7" />
        <circle cx="17" cy="17" r="2" fill="#ddc8d8" fillOpacity=".42" />
      </pattern>
    </defs>
    <path d="M18 635V326C18 187 107 83 270 16c163 67 252 171 252 310v309Z" fill="url(#arch-velvet)" stroke="#b899c4" strokeOpacity=".56" strokeWidth="1.5" />
    <path d="M18 635V326C18 187 107 83 270 16c163 67 252 171 252 310v309Z" fill="url(#arch-damask)" />
    <path d="M34 635V326C34 196 119 98 270 34c151 64 236 162 236 292v309M51 635V328C51 204 130 112 270 51c140 61 219 153 219 277v307" fill="none" stroke="#c8adcf" strokeOpacity=".35" strokeWidth="1" />
    <path d="M66 635V328C66 215 140 130 270 68c130 62 204 147 204 260v307M34 566h472m-472 12h472M79 635V405m382 230V405" fill="none" stroke="#b99abe" strokeOpacity=".22" strokeWidth="1" />
    <path d="M270 25v38m-13-17h26m-19-11 13 22m0-22-13 22M270 633v-48m-10 24h20" fill="none" stroke="#d4b8db" strokeOpacity=".62" strokeWidth="1" />
    <circle cx="270" cy="27" r="7" fill="none" stroke="#d4b8db" strokeOpacity=".65" />
    <path d="M45 320C45 185 128 103 270 44c142 59 225 141 225 276v9H45Zm19 305v-90h14v90m384 0v-90h14v90" fill="url(#arch-lace)" opacity=".8" />
    <g fill="none" stroke="#d7bdd8" strokeOpacity=".68" strokeWidth="1">
      <circle cx="270" cy="151" r="49" /><circle cx="270" cy="151" r="40" /><circle cx="270" cy="151" r="11" />
      <path d="M270 102c-9 11-17 18-25 21 8 8 16 17 25 28 9-11 17-20 25-28-8-3-16-10-25-21Zm-49 49c11-9 18-17 21-25 8 8 17 16 28 25-11 9-20 17-28 25-3-8-10-16-21-25Zm98 0c-11-9-18-17-21-25-8 8-17 16-28 25 11 9 20 17 28 25 3-8 10-16 21-25Z" />
      <path d="M217 282V226c0-20 17-38 34-55m72 111V226c0-20-17-38-34-55m-53 120V236c0-12 14-28 34-43 20 15 34 31 34 43v111" />
      <path d="M117 376v-73c0-31 21-55 45-77 24 22 45 46 45 77v73m126 0v-73c0-31 21-55 45-77 24 22 45 46 45 77v73" />
      <path d="M117 312c12-17 28-29 45-42 17 13 33 25 45 42m126 0c12-17 28-29 45-42 17 13 33 25 45 42M82 568h376m-346 20 78-150m230 150-78-150m-160 150 45-150m106 150-45-150M82 603l150-165m226 165L308 438m-164 165 111-165m138 165L282 438" />
      <path d="M60 345c7-7 14-14 21-21 7 7 14 14 21 21-7 7-14 14-21 21-7-7-14-14-21-21Zm357 0c7-7 14-14 21-21 7 7 14 14 21 21-7 7-14 14-21 21-7-7-14-14-21-21Z" />
    </g>
  </svg>;
}
