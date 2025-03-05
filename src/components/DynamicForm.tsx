import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Form, Row, Col, Button, Card } from 'react-bootstrap'

interface FormField {
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

interface DynamicFormProps {
  schema: FormField[] | null
  onChange: (formData: Record<string, unknown>) => void
  initialValues?: Record<string, unknown>
  isDisabled?: boolean
}

/**
 * Dynamic form component that generates form fields based on a JSON schema
 * @param props Component properties
 * @returns React component
 */
export function DynamicForm({
  schema,
  onChange,
  initialValues = {},
  isDisabled = false,
}: DynamicFormProps): React.JSX.Element {
  const [formValues, setFormValues] = useState<Record<string, unknown>>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Create a ref to track the previous form values
  const prevFormDataRef = useRef('')
  const initialized = useRef(false)

  /**
   * Initialize array fields with minimum items if specified
   * @param fields Form fields schema
   * @param values Current form values
   * @returns Updated form values with initialized arrays
   */
  const initializeArrayFields = useCallback(
    (fields: FormField[], values: Record<string, unknown>): Record<string, unknown> => {
      const updatedValues = { ...values }

      fields.forEach(field => {
        // Handle array fields
        if (field.type === 'array' && field.arrayItemSchema) {
          const fieldValue = updatedValues[field.name]
          const currentArray = Array.isArray(fieldValue) ? fieldValue : []

          // If minItems is specified and the array has fewer items, add items to meet the minimum
          if (field.minItems !== undefined && currentArray.length < field.minItems) {
            const arrayToUpdate = [...currentArray]

            // Create default items based on the item schema type
            for (let i = currentArray.length; i < field.minItems; i++) {
              let defaultValue: unknown = ''

              if (field.arrayItemSchema.type === 'object' && field.arrayItemSchema.fields) {
                defaultValue = {}

                // If the array item is an object with its own fields, recursively initialize those fields
                if (
                  field.arrayItemSchema.fields.some(
                    nestedField => nestedField.type === 'array' && nestedField.minItems !== undefined,
                  )
                ) {
                  defaultValue = initializeArrayFields(
                    field.arrayItemSchema.fields,
                    defaultValue as Record<string, unknown>,
                  )
                }
              } else if (field.arrayItemSchema.type === 'array') {
                defaultValue = []
              } else if (field.arrayItemSchema.type === 'number') {
                defaultValue = 0
              } else if (field.arrayItemSchema.type === 'boolean') {
                defaultValue = false
              }

              arrayToUpdate.push(defaultValue)
            }

            updatedValues[field.name] = arrayToUpdate
          }
        }

        // Handle nested object fields
        if (field.type === 'object' && field.fields) {
          const fieldValue = updatedValues[field.name] as Record<string, unknown> | undefined
          const objectValue = fieldValue ?? {}

          // Recursively initialize arrays in nested objects
          if (field.fields.some(nestedField => nestedField.type === 'array' && nestedField.minItems !== undefined)) {
            updatedValues[field.name] = initializeArrayFields(field.fields, objectValue)
          }
        }
      })

      return updatedValues
    },
    [],
  )

  // Initialize the form with minimum array items when schema changes
  useEffect(() => {
    if (schema && !initialized.current) {
      initialized.current = true
      setFormValues(prevValues => initializeArrayFields(schema, prevValues))
    }
  }, [schema, initializeArrayFields])

  // Update form values when initialValues change
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      const updatedValues = schema ? initializeArrayFields(schema, initialValues) : initialValues
      setFormValues(updatedValues)
    }
  }, [initialValues, schema, initializeArrayFields])

  // Update parent component with form data when values change
  useEffect(() => {
    // Use JSON.stringify to compare objects for deep equality
    // This prevents unnecessary updates
    const currentFormDataJson = JSON.stringify(formValues)

    // Only call onChange if the form values have actually changed
    if (prevFormDataRef.current !== currentFormDataJson) {
      prevFormDataRef.current = currentFormDataJson
      onChange(formValues)
    }
  }, [formValues, onChange])

  /**
   * Handle form field changes
   * @param name Field name
   * @param value Field value
   */
  const handleFieldChange = (name: string, value: unknown): void => {
    setFormValues(prev => ({ ...prev, [name]: value }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [name]: removed, ...rest } = prev
        return rest
      })
    }
  }

  /**
   * Handle nested object field changes
   * @param parentName Parent field name
   * @param nestedValue Nested field value
   */
  const handleNestedFieldChange = (parentName: string, nestedValue: Record<string, unknown>): void => {
    setFormValues(prev => {
      const currentParentValue = prev[parentName] as Record<string, unknown> | undefined
      return {
        ...prev,
        [parentName]: {
          ...(currentParentValue ?? {}),
          ...nestedValue,
        },
      }
    })
  }

  /**
   * Handle array field changes
   * @param name Array field name
   * @param index Item index
   * @param value Item value
   */
  const handleArrayItemChange = (name: string, index: number, value: unknown): void => {
    setFormValues(prev => {
      const array = Array.isArray(prev[name]) ? [...(prev[name] as unknown[])] : []
      array[index] = value
      return { ...prev, [name]: array }
    })
  }

  /**
   * Add a new item to an array field
   * @param name Array field name
   * @param itemSchema Schema for the new item
   */
  const handleAddArrayItem = (name: string, itemSchema: FormField): void => {
    setFormValues(prev => {
      const array = Array.isArray(prev[name]) ? [...(prev[name] as unknown[])] : []

      // Create default value based on schema type
      let defaultValue: unknown = ''
      if (itemSchema.type === 'object' && itemSchema.fields) {
        defaultValue = {}
      } else if (itemSchema.type === 'array') {
        defaultValue = []
      } else if (itemSchema.type === 'number') {
        defaultValue = 0
      } else if (itemSchema.type === 'boolean') {
        defaultValue = false
      }

      array.push(defaultValue)
      return { ...prev, [name]: array }
    })
  }

  /**
   * Remove an item from an array field
   * @param name Array field name
   * @param index Item index to remove
   */
  const handleRemoveArrayItem = (name: string, index: number): void => {
    setFormValues(prev => {
      const array = Array.isArray(prev[name]) ? [...(prev[name] as unknown[])] : []
      array.splice(index, 1)
      return { ...prev, [name]: array }
    })
  }

  /**
   * Renders a form field based on its type
   * @param field The field configuration
   * @returns React component
   */
  const renderField = (field: FormField): React.ReactNode => {
    const { name, type, label, placeholder, required, options, min, max, pattern } = field
    const value = formValues[name] !== undefined ? formValues[name] : field.defaultValue || ''
    const isInvalid = !!errors[name]

    switch (type) {
      case 'text':
      case 'email':
      case 'password':
      case 'url':
      case 'tel':
        return (
          <Form.Group key={name} className="mb-3">
            <Form.Label>
              {label}
              {required && <span className="text-danger">*</span>}
            </Form.Label>
            <Form.Control
              type={type}
              name={name}
              value={value as string}
              onChange={(e): void => {
                handleFieldChange(name, e.target.value)
              }}
              placeholder={placeholder}
              required={required}
              isInvalid={isInvalid}
              disabled={isDisabled}
              min={min}
              max={max}
              pattern={pattern}
            />
            <Form.Control.Feedback type="invalid">{errors[name]}</Form.Control.Feedback>
          </Form.Group>
        )

      case 'number':
        return (
          <Form.Group key={name} className="mb-3">
            <Form.Label>
              {label}
              {required && <span className="text-danger">*</span>}
            </Form.Label>
            <Form.Control
              type="number"
              name={name}
              value={value as number}
              onChange={(e): void => {
                handleFieldChange(name, Number(e.target.value))
              }}
              placeholder={placeholder}
              required={required}
              isInvalid={isInvalid}
              disabled={isDisabled}
              min={min}
              max={max}
            />
            <Form.Control.Feedback type="invalid">{errors[name]}</Form.Control.Feedback>
          </Form.Group>
        )

      case 'textarea':
        return (
          <Form.Group key={name} className="mb-3">
            <Form.Label>
              {label}
              {required && <span className="text-danger">*</span>}
            </Form.Label>
            <Form.Control
              as="textarea"
              name={name}
              value={value as string}
              onChange={(e): void => {
                handleFieldChange(name, e.target.value)
              }}
              placeholder={placeholder}
              required={required}
              isInvalid={isInvalid}
              disabled={isDisabled}
              rows={3}
            />
            <Form.Control.Feedback type="invalid">{errors[name]}</Form.Control.Feedback>
          </Form.Group>
        )

      case 'select':
        return (
          <Form.Group key={name} className="mb-3">
            <Form.Label>
              {label}
              {required && <span className="text-danger">*</span>}
            </Form.Label>
            <Form.Select
              name={name}
              value={value as string}
              onChange={(e): void => {
                handleFieldChange(name, e.target.value)
              }}
              required={required}
              isInvalid={isInvalid}
              disabled={isDisabled}
            >
              <option value="">{placeholder ?? 'Select an option'}</option>
              {options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">{errors[name]}</Form.Control.Feedback>
          </Form.Group>
        )

      case 'checkbox':
        return (
          <Form.Group key={name} className="mb-3">
            <Form.Check
              type="checkbox"
              id={`checkbox-${name}`}
              name={name}
              label={label}
              checked={Boolean(value)}
              onChange={(e): void => {
                handleFieldChange(name, e.target.checked)
              }}
              isInvalid={isInvalid}
              disabled={isDisabled}
              feedback={errors[name]}
              feedbackType="invalid"
            />
          </Form.Group>
        )

      case 'radio':
        return (
          <Form.Group key={name} className="mb-3">
            <Form.Label>
              {label}
              {required && <span className="text-danger">*</span>}
            </Form.Label>
            <div>
              {options?.map(option => (
                <Form.Check
                  key={option.value}
                  type="radio"
                  id={`radio-${name}-${option.value}`}
                  name={name}
                  label={option.label}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e): void => {
                    handleFieldChange(name, e.target.value)
                  }}
                  isInvalid={isInvalid}
                  disabled={isDisabled}
                  feedback={errors[name]}
                  feedbackType="invalid"
                />
              ))}
            </div>
          </Form.Group>
        )

      case 'date':
        return (
          <Form.Group key={name} className="mb-3">
            <Form.Label>
              {label}
              {required && <span className="text-danger">*</span>}
            </Form.Label>
            <Form.Control
              type="date"
              name={name}
              value={value as string}
              onChange={(e): void => {
                handleFieldChange(name, e.target.value)
              }}
              required={required}
              isInvalid={isInvalid}
              disabled={isDisabled}
              min={min}
              max={max}
            />
            <Form.Control.Feedback type="invalid">{errors[name]}</Form.Control.Feedback>
          </Form.Group>
        )

      case 'object': {
        if (!field.fields || field.fields.length === 0) {
          return null
        }

        // Create initial values for nested object if not already set
        const nestedValues = (value ?? {}) as Record<string, unknown>

        return (
          <Form.Group key={name} className="mb-3">
            <Form.Label>
              {label}
              {required && <span className="text-danger">*</span>}
            </Form.Label>
            <Card className="p-3">
              <DynamicForm
                schema={field.fields}
                onChange={(nestedData): void => {
                  handleNestedFieldChange(name, nestedData)
                }}
                initialValues={nestedValues}
                isDisabled={isDisabled}
              />
            </Card>
          </Form.Group>
        )
      }

      case 'array': {
        if (!field.arrayItemSchema) {
          return null
        }

        // Initialize array if not already set
        const arrayValue = (Array.isArray(value) ? value : []) as unknown[]
        const itemSchema = field.arrayItemSchema
        const hasReachedMax = field.maxItems !== undefined && arrayValue.length >= field.maxItems

        return (
          <Form.Group key={name} className="mb-3">
            <Form.Label>
              {label}
              {required && <span className="text-danger">*</span>}
            </Form.Label>

            {arrayValue.length === 0 && <div className="text-muted mb-2">No items added yet.</div>}

            {arrayValue.map((item, index) => (
              <Card key={`${name}-item-${String(index + 1)}`} className="mb-2">
                <Card.Body>
                  <div className="d-flex justify-content-between mb-2">
                    <div className="fw-bold">Item {String(index + 1)}</div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={(): void => {
                        handleRemoveArrayItem(name, index)
                      }}
                      disabled={isDisabled || (field.minItems !== undefined && arrayValue.length <= field.minItems)}
                    >
                      <i className="bi bi-trash"></i> Remove
                    </Button>
                  </div>

                  {itemSchema.type === 'object' && itemSchema.fields ? (
                    <DynamicForm
                      schema={itemSchema.fields}
                      onChange={(nestedData): void => {
                        handleArrayItemChange(name, index, nestedData)
                      }}
                      initialValues={item as Record<string, unknown>}
                      isDisabled={isDisabled}
                    />
                  ) : (
                    renderPrimitiveArrayItem(name, index, item, itemSchema)
                  )}
                </Card.Body>
              </Card>
            ))}

            <div className="mt-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={(): void => {
                  handleAddArrayItem(name, itemSchema)
                }}
                disabled={isDisabled || hasReachedMax}
              >
                <i className="bi bi-plus-circle"></i> Add {label}
              </Button>
              {field.minItems !== undefined && (
                <small className="text-muted ms-2">
                  Min: {String(field.minItems)}, Current: {String(arrayValue.length)}
                  {field.maxItems !== undefined && `, Max: ${String(field.maxItems)}`}
                </small>
              )}
            </div>
            {isInvalid && <div className="text-danger">{errors[name]}</div>}
          </Form.Group>
        )
      }

      default:
        return null
    }
  }

  /**
   * Renders a primitive array item (string, number, boolean)
   * @param arrayName The name of the array field
   * @param index The index of the item in the array
   * @param value The current value of the item
   * @param itemSchema The schema for the array items
   * @returns React component
   */
  const renderPrimitiveArrayItem = (
    arrayName: string,
    index: number,
    value: unknown,
    itemSchema: FormField,
  ): React.ReactNode => {
    const { type, min, max, pattern } = itemSchema

    switch (type) {
      case 'text':
      case 'email':
      case 'url':
      case 'tel':
        return (
          <Form.Control
            type={type}
            value={value as string}
            onChange={(e): void => {
              handleArrayItemChange(arrayName, index, e.target.value)
            }}
            disabled={isDisabled}
            min={min}
            max={max}
            pattern={pattern}
          />
        )

      case 'number':
        return (
          <Form.Control
            type="number"
            value={value as number}
            onChange={(e): void => {
              handleArrayItemChange(arrayName, index, Number(e.target.value))
            }}
            disabled={isDisabled}
            min={min}
            max={max}
          />
        )

      case 'checkbox':
        return (
          <Form.Check
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e): void => {
              handleArrayItemChange(arrayName, index, e.target.checked)
            }}
            disabled={isDisabled}
          />
        )

      default:
        return (
          <Form.Control
            type="text"
            value={value as string}
            onChange={(e): void => {
              handleArrayItemChange(arrayName, index, e.target.value)
            }}
            disabled={isDisabled}
          />
        )
    }
  }

  // If no schema is provided, don't render anything
  if (!schema || schema.length === 0) {
    return <p className="text-muted">No form fields defined.</p>
  }

  // Mobile-friendly layout using Bootstrap grid
  return (
    <Row className="g-3">
      {schema.map(field => (
        <Col
          key={field.name}
          xs={12}
          md={field.type === 'textarea' || field.type === 'array' || field.type === 'object' ? 12 : 6}
        >
          {renderField(field)}
        </Col>
      ))}
    </Row>
  )
}
