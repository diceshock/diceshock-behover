import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, useRef } from "react";
import { selectedTableDataAtom, selectionClearSignalAtom } from "./chatAtoms";

type UseSelectedTableDataParams<T extends object> = {
  entityType: string;
  rows: T[];
  selectedIds: Set<string>;
  getRowId: (row: T) => string;
  onClear: () => void;
};

export function useSelectedTableData<T extends object>({
  entityType,
  rows,
  selectedIds,
  getRowId,
  onClear,
}: UseSelectedTableDataParams<T>) {
  const setSelectedTableData = useSetAtom(selectedTableDataAtom);
  const clearSignal = useAtomValue(selectionClearSignalAtom);
  const didMount = useRef(false);
  const previousClearSignal = useRef(clearSignal);

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.has(getRowId(row))),
    [rows, selectedIds, getRowId],
  );

  useEffect(() => {
    setSelectedTableData({
      count: selectedRows.length,
      entityType,
      rows: selectedRows,
    });
  }, [entityType, selectedRows, setSelectedTableData]);

  useEffect(() => {
    return () => setSelectedTableData({ count: 0, entityType: "", rows: [] });
  }, [setSelectedTableData]);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      previousClearSignal.current = clearSignal;
      return;
    }
    if (previousClearSignal.current !== clearSignal) {
      previousClearSignal.current = clearSignal;
      onClear();
    }
  }, [clearSignal, onClear]);
}
