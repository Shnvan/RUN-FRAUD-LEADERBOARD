import Image from "next/image";
import type {CSSProperties,ReactNode} from "react";

export type FrausCharacter="clown"|"jester"|"snake"|"rat";
export type CharacterPose="dancing"|"pointing"|"hanging"|"laughing"|"sign"|"salesman"|"running"|"suspicious";
export type UserReactionName="burns-suspicious"|"krabs-money"|"rat-money"|"court-jester"|"clown-makeup"|"sad-clown"|"crocodile-suit"|"clown-portrait"|"no-bozos"|"red-angry"|"crying-face"|"anime-grin"|"clown-juggling"|"angry-yellow"|"batman-thinking"|"masked-runner"|"clown-waving";

const sources:Record<FrausCharacter,Partial<Record<CharacterPose,string>>>={
  clown:{dancing:"/assets/characters/clown-dancing.webp",pointing:"/assets/characters/clown-pointing.webp"},
  jester:{hanging:"/assets/characters/jester-hanging.webp",laughing:"/assets/characters/jester-laughing.webp",sign:"/assets/characters/jester-sign.webp"},
  snake:{salesman:"/assets/characters/snake-salesman.webp"},
  rat:{running:"/assets/characters/rat-running.gif",suspicious:"/assets/characters/rat-suspicious.webp"},
};

const reducedMotionSources:Partial<Record<CharacterPose,string>>={
  dancing:"/assets/characters/clown-dance.webp",
  running:"/assets/characters/rat-suspicious.webp",
};

const reactionSources:Record<UserReactionName,{src:string;still?:string;width:number;height:number}>={
  "burns-suspicious":{src:"burns-suspicious.webp",width:640,height:960},
  "krabs-money":{src:"krabs-money.webp",width:736,height:736},
  "rat-money":{src:"rat-money.webp",width:305,height:343},
  "court-jester":{src:"court-jester.webp",width:735,height:618},
  "clown-makeup":{src:"clown-makeup.webp",width:320,height:246},
  "sad-clown":{src:"sad-clown.webp",width:250,height:259},
  "crocodile-suit":{src:"crocodile-suit.webp",width:736,height:1308},
  "clown-portrait":{src:"clown-portrait.webp",width:375,height:495},
  "no-bozos":{src:"no-bozos.webp",width:736,height:815},
  "red-angry":{src:"red-angry.webp",width:512,height:512},
  "crying-face":{src:"crying-face.webp",width:720,height:713},
  "anime-grin":{src:"anime-grin.webp",width:1280,height:720},
  "clown-juggling":{src:"clown-juggling.gif",still:"clown-juggling-still.webp",width:312,height:312},
  "angry-yellow":{src:"angry-yellow.gif",still:"angry-yellow-still.webp",width:540,height:540},
  "batman-thinking":{src:"batman-thinking.gif",still:"batman-thinking-still.webp",width:500,height:345},
  "masked-runner":{src:"masked-runner.gif",still:"masked-runner-still.webp",width:242,height:350},
  "clown-waving":{src:"clown-waving.gif",still:"clown-waving-still.webp",width:312,height:312},
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

export function ReactionImage({name,className="",priority=false,label,style}:{name:UserReactionName;className?:string;priority?:boolean;label?:string;style?:CSSProperties}){
  const asset=reactionSources[name];
  const src=`/assets/user-reactions/${asset.src}`;
  const classes=`reaction-image reaction-image--${name} ${className}`;
  if(!asset.still)return <Image unoptimized src={src} width={asset.width} height={asset.height} priority={priority} alt={label||""} aria-hidden={label?undefined:true} className={classes} style={style}/>;
  return <>
    <Image unoptimized src={src} width={asset.width} height={asset.height} priority={priority} alt={label||""} aria-hidden={label?undefined:true} className={`${classes} fraus-motion-animated`} style={style}/>
    <Image src={`/assets/user-reactions/${asset.still}`} width={asset.width} height={asset.height} alt="" aria-hidden className={`${classes} fraus-motion-static`} style={style}/>
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
