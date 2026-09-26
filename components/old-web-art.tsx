import Image from "next/image";
import type {CSSProperties,ReactNode} from "react";

export type FrausCharacter="clown"|"jester"|"crocodile"|"snake"|"rat"|"bozo";
export type CharacterPose="dancing"|"pointing"|"hanging"|"laughing"|"sign"|"crying"|"peeking"|"salesman"|"running"|"suspicious"|"confused"|"certified";

const sources:Record<FrausCharacter,Partial<Record<CharacterPose,string>>>={
  clown:{dancing:"/assets/characters/clown-dancing.webp",pointing:"/assets/characters/clown-pointing.webp"},
  jester:{hanging:"/assets/characters/jester-hanging.webp",laughing:"/assets/characters/jester-laughing.webp",sign:"/assets/characters/jester-sign.webp"},
  crocodile:{crying:"/assets/characters/crocodile-crying.webp",peeking:"/assets/characters/crocodile-peeking.webp"},
  snake:{salesman:"/assets/characters/snake-salesman.webp"},
  rat:{running:"/assets/characters/rat-running.gif",suspicious:"/assets/characters/rat-suspicious.webp"},
  bozo:{confused:"/assets/characters/bozo-confused.webp",certified:"/assets/characters/bozo-certified.webp"},
};

const reducedMotionSources:Partial<Record<CharacterPose,string>>={
  dancing:"/assets/characters/clown-dance.webp",
  running:"/assets/characters/rat-suspicious.webp",
};

export function CharacterArt({character,pose,className="",priority=false,label,style}:{character:FrausCharacter;pose:CharacterPose;className?:string;priority?:boolean;label?:string;style?:CSSProperties}){
  const src=sources[character][pose]||Object.values(sources[character])[0]!;
  const classes=`fraus-character fraus-character--${character} fraus-character--${pose} ${className}`;
  const fallback=reducedMotionSources[pose];
  if(!fallback)return <Image unoptimized src={src} width={560} height={560} priority={priority} alt={label||""} aria-hidden={label?undefined:true} className={classes} style={style}/>;
  return <>
    <Image unoptimized src={src} width={560} height={560} priority={priority} alt={label||""} aria-hidden={label?undefined:true} className={`${classes} fraus-motion-animated`} style={style}/>
    <Image src={fallback} width={560} height={560} alt="" aria-hidden className={`${classes} fraus-motion-static`} style={style}/>
  </>;
}

export function WebBadge({name,alt=""}:{name:"fraus-archive"|"best-viewed"|"guestbook"|"email-receipts";alt?:string}){
  return <Image unoptimized src={`/assets/badges/${name}.gif`} width={88} height={31} alt={alt} aria-hidden={alt?undefined:true} className="pixel-art old-web-badge"/>;
}

export function BlinkSticker({kind}:{kind:"new"|"warning"}){
  return <Image unoptimized src={`/assets/stickers/${kind}-blink.gif`} width={88} height={31} alt="" aria-hidden className="pixel-art inline-block"/>;
}

export function MarqueeStrip({children}:{children:ReactNode}){
  return <div className="web-marquee" role="presentation"><div className="web-marquee__track"><span>{children}</span><span aria-hidden="true">{children}</span></div></div>;
}

export function VisitorCounter({value}:{value:number}){
  const digits=String(Math.max(0,value)).padStart(6,"0");
  return <span className="visitor-counter" aria-label={`${value} visible reviewed sellers`}>{digits.split("").map((digit,index)=><i key={`${index}-${digit}`}>{digit}</i>)}</span>;
}
