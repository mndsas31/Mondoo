import React from 'react';
import { Media } from '../types';
import { Row } from './Row';

interface Top10RowProps {
  title: string;
  items: Media[];
  onOpenModal: (item: Media) => void;
}

export const Top10Row: React.FC<Top10RowProps> = ({ title, items, onOpenModal }) => {
  return (
    <Row title={title} items={items} isTop10 onOpenModal={onOpenModal} variant="portrait" />
  );
};
