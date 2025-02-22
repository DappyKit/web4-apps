export interface User {
  address: string;
  username?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface App {
  id: number;
  name: string;
  description?: string;
  owner_address: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateAppDTO {
  name: string;
  description?: string;
  signature: string;
  message: string;
} 