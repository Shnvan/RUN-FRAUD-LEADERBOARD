import type {ReactNode} from "react";

type RetroWindowProps = {
  title: string;
  eyebrow?: string;
  tone?: "plum" | "cobalt" | "red" | "lime" | "paper";
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
  actions?: ReactNode;
  chrome?: "classic" | "browser" | "dialog";
  overflow?: "hidden" | "visible";
};

export function RetroWindow({title,eyebrow,tone="paper",className="",bodyClassName="",children,actions,chrome="classic",overflow="hidden"}:RetroWindowProps){
  return <div className={`retro-window retro-window--${tone} retro-window--${chrome} retro-window--overflow-${overflow} ${className}`}>
    <div className="retro-titlebar"><span className="retro-titlebar__app" aria-hidden="true">F</span><span className="retro-titlebar__name">{title}</span>{eyebrow&&<span className="retro-titlebar__eyebrow">{eyebrow}</span>}{actions&&<div className="retro-titlebar__actions">{actions}</div>}<span className="retro-titlebar__controls" aria-hidden="true"><i>_</i><i>□</i><i>×</i></span></div>
    {chrome==="browser"&&<div className="retro-browserbar" aria-hidden="true"><span>File</span><span>Edit</span><span>View</span><span>Go</span><span className="retro-address">http://fraus.xyz/archive</span></div>}
    <div className={`retro-window__body ${bodyClassName}`}>{children}</div>
  </div>;
}

export function StatusStrip({children,className=""}:{children:ReactNode;className?:string}){return <div className={`status-strip ${className}`}>{children}</div>}
