/**
 * Interface for form field configuration
 */
import { capitalizeFieldName } from './stringUtils'

export interface FormField {
  name: string
  type: string
  label: string
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  pattern?: string
  defaultValue?: unknown
  fields?: FormField[] // For object fields with nested properties
  arrayItemSchema?: FormField // For array fields, defines the schema of each array item
  minItems?: number
  maxItems?: number
}

interface JsonSchemaProperty {
  type: string
  title?: string
  description?: string
  enum?: string[]
  format?: string
  default?: unknown
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  items?: JsonSchemaProperty | { type: string; properties?: Record<string, JsonSchemaProperty>; required?: string[] }
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
  minItems?: number
  maxItems?: number
}

interface JsonSchema {
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
  fields?: unknown[]
  type?: string
}

/**
 * Recursively parse JSON schema properties into form fields
 * @param properties - The JSON schema properties
 * @param requiredFields - List of required field names
 * @returns Array of form fields
 */
function parseSchemaProperties(
  properties: Record<string, JsonSchemaProperty>,
  requiredFields: string[] = [],
): FormField[] {
  return Object.entries(properties).map(([name, property]) => {
    const field: FormField = {
      name,
      label: property.title ?? capitalizeFieldName(name),
      required: requiredFields.includes(name),
      placeholder: property.description,
      type: 'text',
      min: property.minimum ?? property.minLength,
      max: property.maximum ?? property.maxLength,
      pattern: property.pattern,
      minItems: property.minItems,
      maxItems: property.maxItems,
    }

    // Set type and handle special cases based on property type
    switch (property.type) {
      case 'string':
        if (property.enum) {
          field.type = 'select'
          field.options = property.enum.map(option => ({
            value: option,
            label: capitalizeFieldName(option),
          }))
        } else if (property.format === 'date' || property.format === 'date-time') {
          field.type = 'date'
        } else if (property.format === 'email') {
          field.type = 'email'
        } else if (property.format === 'uri' || property.format === 'url') {
          field.type = 'url'
        } else {
          field.type = property.format === 'textarea' ? 'textarea' : 'text'
        }
        break

      case 'number':
      case 'integer':
        field.type = 'number'
        break

      case 'boolean':
        field.type = 'checkbox'
        break

      case 'array':
        field.type = 'array'
        if (property.items) {
          // If the array contains objects
          if (typeof property.items === 'object' && 'properties' in property.items && property.items.properties) {
            const nestedRequired = Array.isArray(property.items.required) ? property.items.required : []
            const arrayItemField: FormField = {
              name: 'item',
              type: 'object',
              label: 'Item',
              fields: parseSchemaProperties(property.items.properties, nestedRequired),
            }
            field.arrayItemSchema = arrayItemField
          }
          // If the array contains primitive values
          else if (typeof property.items === 'object' && 'type' in property.items) {
            const itemType = property.items.type
            let arrayItemType = 'text'

            switch (itemType) {
              case 'number':
              case 'integer':
                arrayItemType = 'number'
                break
              case 'boolean':
                arrayItemType = 'checkbox'
                break
              default:
                arrayItemType = 'text'
            }

            field.arrayItemSchema = {
              name: 'value',
              type: arrayItemType,
              label: 'Value',
              min:
                'minimum' in property.items
                  ? property.items.minimum
                  : 'minLength' in property.items
                    ? property.items.minLength
                    : undefined,
              max:
                'maximum' in property.items
                  ? property.items.maximum
                  : 'maxLength' in property.items
                    ? property.items.maxLength
                    : undefined,
              pattern: 'pattern' in property.items ? property.items.pattern : undefined,
            }
          }
        }
        break

      case 'object':
        field.type = 'object'
        if (property.properties) {
          const nestedRequired = Array.isArray(property.required) ? property.required : []
          field.fields = parseSchemaProperties(property.properties, nestedRequired)
        }
        break

      default:
        field.type = 'text'
    }

    // Set default value if available
    if (property.default !== undefined) {
      field.defaultValue = property.default
    }

    // For select fields, also update the label in options if it equals the value
    if (field.type === 'select' && field.options) {
      field.options = field.options.map(option => ({
        value: option.value,
        label: option.value === option.label ? capitalizeFieldName(option.value) : option.label,
      }))
    }

    return field
  })
}

/**
 * Parses a JSON schema into an array of form fields
 * @param jsonSchema - The JSON schema string to parse
 * @returns Array of form fields
 */
export function parseTemplateSchema(jsonSchema: string): FormField[] {
  try {
    // Parse the JSON schema
    const schema = JSON.parse(jsonSchema) as JsonSchema

    const fields: FormField[] = []

    // If the schema has a fields array property, use it directly
    if (Array.isArray(schema.fields)) {
      return schema.fields.map((field): FormField => {
        const typedField = field as Record<string, unknown>
        const name = typeof typedField.name === 'string' ? typedField.name : ''
        const type = typeof typedField.type === 'string' ? typedField.type : 'text'
        const label = typeof typedField.label === 'string' ? typedField.label : name

        return {
          name,
          type,
          label,
          placeholder: typedField.placeholder as string,
          required: typedField.required as boolean,
          options: typedField.options as { value: string; label: string }[],
          min: typedField.min as number,
          max: typedField.max as number,
          pattern: typedField.pattern as string,
          defaultValue: typedField.defaultValue,
          fields: typedField.fields as FormField[],
          arrayItemSchema: typedField.arrayItemSchema as FormField,
          minItems: typedField.minItems as number,
          maxItems: typedField.maxItems as number,
        }
      })
    }

    // If it's a standard JSON Schema
    if (schema.properties && typeof schema.properties === 'object') {
      const requiredFields = Array.isArray(schema.required) ? schema.required : []
      return parseSchemaProperties(schema.properties, requiredFields)
    }
    // If it's a simple object and not a standard JSON Schema
    else if (typeof schema === 'object' && !schema.type) {
      // Process each property as a form field
      Object.entries(schema).forEach(([key, value]) => {
        if (typeof value === 'function' || (typeof value === 'object' && value !== null && !('type' in value))) {
          return
        }

        const field: FormField = {
          name: key,
          label: key,
          type: 'text',
        }

        // If value is an object with type property
        if (typeof value === 'object' && value !== null && 'type' in value) {
          const typedValue = value as Record<string, unknown>
          field.type = typeof typedValue.type === 'string' ? typedValue.type : 'text'
          field.label = typeof typedValue.label === 'string' ? typedValue.label : key
          field.placeholder = typedValue.placeholder as string
          field.required = typedValue.required as boolean
          field.options = typedValue.options as { value: string; label: string }[]
          field.min = typedValue.min as number
          field.max = typedValue.max as number
          field.pattern = typedValue.pattern as string
          field.defaultValue = typedValue.default
          field.fields = typedValue.fields as FormField[]
          field.arrayItemSchema = typedValue.arrayItemSchema as FormField
          field.minItems = typedValue.minItems as number
          field.maxItems = typedValue.maxItems as number
        } else {
          // Use the value as default value and infer type
          field.defaultValue = value
          field.type = typeof value === 'boolean' ? 'checkbox' : typeof value === 'number' ? 'number' : 'text'
        }

        fields.push(field)
      })
    }

    return fields
  } catch (error) {
    console.error('Error parsing schema:', error)
    return []
  }
}

/**
 * Converts form data to JSON string
 * @param formData - The form data object
 * @returns JSON string
 */
export function formDataToJson(formData: Record<string, unknown>): string {
  try {
    return JSON.stringify(formData, null, 2)
  } catch (error) {
    console.error('Error converting form data to JSON:', error)
    return '{}'
  }
}
