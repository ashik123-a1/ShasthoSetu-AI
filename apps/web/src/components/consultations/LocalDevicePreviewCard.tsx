import { LiveConsultationCallStudio } from "./LiveConsultationCallStudio";

export function LocalDevicePreviewCard({ darkCard = true }: { darkCard?: boolean }) {
  return (
    <div className={darkCard ? "" : "rounded-3xl"}>
      <LiveConsultationCallStudio
        roomId="public-consult-preview"
        counterpartyName="Dr. Farhana Rahman (Demo On-Call)"
        counterpartyRole="MBBS, FCPS (Gynae) • Live Consultation Preview"
        counterpartyAvatar="/images/doctors/doc-f-01.jpg"
        initialMode="VIDEO"
      />
    </div>
  );
}
