import CsvImportWizard from "@/components/CsvImportWizard";

export default function CsvImport() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Import transactions from CSV</h1>
      <CsvImportWizard />
    </div>
  );
}
