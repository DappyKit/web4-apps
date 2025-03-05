/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import React from 'react'
import { Form, Row, Col } from 'react-bootstrap'
import type { FormField as SchemaFormField } from '../utils/schemaParser'

interface ReadOnlyFormProps {
  schema: SchemaFormField[] | null
  data: Record<string, unknown>
}

/**
 * A read-only form component that displays form data based on a schema
 * @param props - Component props
 * @returns ReadOnlyForm component
 */
export function ReadOnlyForm({ schema, data }: ReadOnlyFormProps): React.JSX.Element {
  if (!schema || schema.length === 0) {
    return <div className="text-muted">No fields to display</div>
  }

  /**
   * Capitalizes the first letter of a string
   * @param str - String to capitalize
   * @returns String with first letter capitalized
   */
  const capitalizeFirstLetter = (str: string): string => {
    if (!str || typeof str !== 'string' || str.length === 0) return str
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  /**
   * Renders a simple text representation of a value
   * @param value - The value to render
   * @returns String representation of the value
   */
  const renderSimpleValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return ''
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }

    if (typeof value === 'string') {
      return value
    }

    if (typeof value === 'number') {
      return String(value)
    }

    // For objects and arrays, use a placeholder
    return '[Complex Value]'
  }

  /**
   * Gets the display value for a select field
   * @param options - Available options
   * @param value - The current value
   * @returns The display value for the select field
   */
  const getSelectDisplayValue = (options: { value: string; label: string }[] | undefined, value: unknown): string => {
    if (!options || !Array.isArray(options)) {
      return renderSimpleValue(value)
    }

    const stringValue = typeof value === 'string' ? value : String(value)
    const option = options.find(opt => opt.value === stringValue)
    return option ? option.label : renderSimpleValue(value)
  }

  /**
   * Renders an array value
   * @param arrayValue - The array value to render
   * @returns JSX element representing the array value
   */
  const renderArrayValue = (arrayValue: unknown[]): React.ReactNode => {
    if (arrayValue.length === 0) {
      return <span className="text-muted">No items</span>
    }

    return (
      <div className="array-items">
        <div className="mb-2 text-muted">Array with {String(arrayValue.length)} items:</div>
        {arrayValue.map((item, index) => (
          <div key={index} className="mb-2 ms-3 border-start ps-2">
            <strong>{index + 1}:</strong>{' '}
            {typeof item === 'object' && item !== null ? (
              <pre className="mb-0 mt-1 ps-3 small">{JSON.stringify(item, null, 2)}</pre>
            ) : (
              <span>{renderSimpleValue(item)}</span>
            )}
          </div>
        ))}
      </div>
    )
  }

  /**
   * Renders a field value based on its type
   * @param field - The field definition
   * @param fieldValue - The field value
   * @returns JSX element representing the field value
   */
  const renderFieldValue = (field: SchemaFormField, fieldValue: unknown): React.ReactNode => {
    if (fieldValue === null || fieldValue === undefined) {
      return <span className="text-muted">Not provided</span>
    }

    switch (field.type) {
      case 'select':
        return getSelectDisplayValue(field.options, fieldValue)

      case 'checkbox':
        return typeof fieldValue === 'boolean' ? (fieldValue ? 'Yes' : 'No') : renderSimpleValue(fieldValue)

      case 'radio':
        return getSelectDisplayValue(field.options, fieldValue)

      case 'textarea':
        return <div>{renderSimpleValue(fieldValue)}</div>

      case 'object':
        if (typeof fieldValue !== 'object' || fieldValue === null) {
          return <span className="text-muted">No data</span>
        }

        return <pre className="mb-0 small">{JSON.stringify(fieldValue, null, 2)}</pre>

      case 'array':
        return Array.isArray(fieldValue) ? renderArrayValue(fieldValue) : <span className="text-muted">No items</span>

      default:
        return renderSimpleValue(fieldValue)
    }
  }

  // Create a safe copy of the schema to avoid unsafe calls
  const safeSchema = Array.isArray(schema) ? schema : []

  return (
    <Form>
      <Row>
        {safeSchema.map(field => {
          // Ensure field is a valid FormField object
          if (!field || typeof field !== 'object' || !field.name) {
            return null
          }

          // Get the field value safely
          const fieldValue = field.name in data ? data[field.name] : undefined

          return (
            <Col key={field.name} xs={12} md={6} className="mb-3">
              <Form.Group>
                <Form.Label>{capitalizeFirstLetter(field.label)}</Form.Label>
                <div className="form-control-plaintext">{renderFieldValue(field, fieldValue)}</div>
              </Form.Group>
            </Col>
          )
        })}
      </Row>
    </Form>
  )
}
