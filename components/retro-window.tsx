import type {ReactNode} from "react";

type RetroWindowProps = {
  title: string;
  eyebrow?: string;
  tone?: "plum" | "cobalt" | "red" | "lime" | "paper";
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function RetroWindow({title,eyebrow,tone="paper",className="",bodyClassName="",children,actions}:RetroWindowProps){
  return <div className={`retro-window retro-window--${tone} ${className}`}>
    <div className="retro-titlebar"><span className="retro-titlebar__dots" aria-hidden="true"><i/><i/><i/></span><span className="retro-titlebar__name">{title}</span>{eyebrow&&<span className="retro-titlebar__eyebrow">{eyebrow}</span>}{actions&&<div className="retro-titlebar__actions">{actions}</div>}</div>
    <div className={`retro-window__body ${bodyClassName}`}>{children}</div>
  </div>;
}

export function StatusStrip({children,className=""}:{children:ReactNode;className?:string}){return <div className={`status-strip ${className}`}>{children}</div>}
