export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  assignedTo: string[]; // Array of participant IDs
}

export interface Participant {
  id: string;
  name: string;
}

export interface Order {
  id: string;
  items: ReceiptItem[];
  tax: number;
  payerId: string;
  timestamp: number;
}

export interface BillState {
  orders: Order[];
  participants: Participant[];
}

export enum AppStep {
  UPLOAD = 'UPLOAD',
  EDIT_AND_ASSIGN = 'EDIT_AND_ASSIGN',
  RESULT = 'RESULT',
}