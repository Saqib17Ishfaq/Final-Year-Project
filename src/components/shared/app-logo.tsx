import { clinicConfig } from "../../../config/clinic.config";
import { X } from "lucide-react";

type AppLogoProps = {
  className?: string;
  imgClassName?: string;
};

export function AppLogo({ className = "", imgClassName = "" }: AppLogoProps) {
  const isCustomLogo =
    clinicConfig.logo.url &&
    clinicConfig.logo.url !== "/favicon.png" &&
    clinicConfig.logo.url !== "/Text - Logo.png" &&
    clinicConfig.logo.url !== "/Text - Logo Dark.png";

  return (
    <div className={`flex items-center justify-center gap-1.5 sm:gap-2.5 ${className}`}>
      {/* OrthoAI Logo */}
      <div className="relative h-full flex items-center justify-center">
        <img
          src="/Text%20-%20Logo.png"
          alt="OrthoAI"
          className={`object-contain block dark:hidden h-full w-auto ${imgClassName}`}
        />
        <img
          src="/Text%20-%20Logo%20Dark.png"
          alt="OrthoAI"
          className={`object-contain hidden dark:block h-full w-auto ${imgClassName}`}
        />
      </div>

      {/* Collaboration X */}
      {isCustomLogo && (
        <>
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0 opacity-40" />
          {/* Clinic Logo */}
          <div className="relative h-full flex items-center justify-center">
            <img
              src={clinicConfig.logo.url}
              alt={clinicConfig.logo.alt}
              className={`object-contain h-full w-auto ${imgClassName}`}
            />
          </div>
        </>
      )}
    </div>
  );
}
