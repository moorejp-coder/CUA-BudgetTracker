import CsvImportWizard from "@/components/CsvImportWizard";

export default function CsvImport() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-[28px] font-semibold text-ink tracking-tight">Import transactions from CSV</h1>
      <CsvImportWizard />
    </div>
  );
}
