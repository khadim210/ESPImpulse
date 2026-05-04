import { useState, useCallback } from 'react';

interface UseModalReturn<T = unknown> {
  isOpen: boolean;
  data: T | null;
  open: (data?: T) => void;
  close: () => void;
  toggle: () => void;
}

export function useModal<T = unknown>(initialState = false): UseModalReturn<T> {
  const [isOpen, setIsOpen] = useState(initialState);
  const [data, setData] = useState<T | null>(null);

  const open = useCallback((modalData?: T) => {
    setData(modalData ?? null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return { isOpen, data, open, close, toggle };
}

interface UseConfirmModalReturn {
  isOpen: boolean;
  itemId: string | null;
  openConfirm: (id: string) => void;
  closeConfirm: () => void;
  isConfirming: boolean;
  setIsConfirming: (value: boolean) => void;
}

export function useConfirmModal(): UseConfirmModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const openConfirm = useCallback((id: string) => {
    setItemId(id);
    setIsOpen(true);
  }, []);

  const closeConfirm = useCallback(() => {
    setIsOpen(false);
    setItemId(null);
    setIsConfirming(false);
  }, []);

  return {
    isOpen,
    itemId,
    openConfirm,
    closeConfirm,
    isConfirming,
    setIsConfirming
  };
}

interface FormModalState<T> {
  isOpen: boolean;
  mode: 'create' | 'edit';
  data: T | null;
}

interface UseFormModalReturn<T> {
  state: FormModalState<T>;
  openCreate: () => void;
  openEdit: (data: T) => void;
  close: () => void;
}

export function useFormModal<T>(): UseFormModalReturn<T> {
  const [state, setState] = useState<FormModalState<T>>({
    isOpen: false,
    mode: 'create',
    data: null
  });

  const openCreate = useCallback(() => {
    setState({ isOpen: true, mode: 'create', data: null });
  }, []);

  const openEdit = useCallback((data: T) => {
    setState({ isOpen: true, mode: 'edit', data });
  }, []);

  const close = useCallback(() => {
    setState({ isOpen: false, mode: 'create', data: null });
  }, []);

  return { state, openCreate, openEdit, close };
}
