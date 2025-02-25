export interface CreateAppDTO {
  name: string;
  description?: string;
  signature: string;
  template_id: number;
  json_data?: string;
}

export interface App {
  id: number;
  name: string;
  description?: string;
  owner_address: string;
  created_at: string;
  updated_at: string;
  template_id: number;
  json_data?: string;
}

export interface CreateUserDTO {
  address: string;
  message: string;
  signature: string;
}

export interface User {
  id: number;
  address: string;
  created_at: string;
  updated_at: string;
} 