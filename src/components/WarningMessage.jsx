export default function WarningMessage({ incompleteMacros = [] }) {
  if (!incompleteMacros.length) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      Dati nutrizionali incompleti: mancano {incompleteMacros.join(', ')}. Puoi selezionare il prodotto solo se i dati principali sono presenti.
    </div>
  );
}
