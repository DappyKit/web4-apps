import { AiService } from '../utils/ai-service'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

/**
 * Script to test the AI service processTemplatePrompt method with a schema
 * This simulates how the AI endpoint would process a request in a production environment
 */
async function main(): Promise<void> {
  // Check if API key is available (would be part of environment setup in production)
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is not set.')
    console.error('Please set it in your .env file or environment before running this script.')
    process.exit(1)
  }

  // Create AI service instance - similar to how it would be initialized in an actual API endpoint
  const aiService = new AiService({
    apiKey,
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 5000,
  })

  // In a real endpoint, the schema might come from a database or template configuration
  // This hardcoded schema simulates what would be retrieved from a template
  // const templateSchema = {
  //   type: 'object',
  //   properties: {
  //     name: {
  //       type: 'string',
  //       minLength: 3,
  //       maxLength: 20,
  //     },
  //     description: {
  //       type: 'string',
  //       minLength: 3,
  //       maxLength: 20,
  //     },
  //     questions: {
  //       type: 'array',
  //       items: {
  //         type: 'object',
  //         properties: {
  //           text: {
  //             type: 'string',
  //             minLength: 3,
  //             maxLength: 20,
  //           },
  //           options: {
  //             type: 'array',
  //             items: {
  //               type: 'string',
  //               minLength: 3,
  //               maxLength: 20,
  //             },
  //             minItems: 4,
  //             maxItems: 4,
  //           },
  //         },
  //         required: ['text', 'options'],
  //       },
  //     },
  //   },
  //   required: ['name', 'description', 'questions'],
  // }
  const templateSchema = {
    "type": "object",
    "properties": {
      "recipeId": {
        "type": "string",
        "pattern": "^RCP-[0-9]{6}$"
      },
      "title": {
        "type": "string",
        "minLength": 5,
        "maxLength": 100
      },
      "description": {
        "type": "string",
        "minLength": 10,
        "maxLength": 500
      },
      "author": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "minLength": 3,
            "maxLength": 100
          },
          "email": {
            "type": "string",
            "format": "email"
          }
        },
        "required": ["name"]
      },
      "prepTime": {
        "type": "number",
        "minimum": 1
      },
      "cookTime": {
        "type": "number",
        "minimum": 0
      },
      "totalTime": {
        "type": "number",
        "minimum": 1
      },
      "servings": {
        "type": "number",
        "minimum": 1
      },
      "difficulty": {
        "type": "string",
        "enum": ["easy", "medium", "hard"]
      },
      "cuisine": {
        "type": "string",
        "minLength": 3,
        "maxLength": 50
      },
      "categories": {
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 3,
          "maxLength": 30
        },
        "minItems": 1,
        "maxItems": 5
      },
      "ingredients": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "minLength": 2,
              "maxLength": 100
            },
            "quantity": {
              "type": "string",
              "minLength": 1,
              "maxLength": 30
            },
            "unit": {
              "type": "string",
              "maxLength": 20
            },
            "notes": {
              "type": "string",
              "maxLength": 200
            }
          },
          "required": ["name", "quantity"]
        },
        "minItems": 1
      },
      "steps": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "number": {
              "type": "number",
              "minimum": 1
            },
            "description": {
              "type": "string",
              "minLength": 10,
              "maxLength": 500
            },
            "timers": {
              "type": "array",
              "items": {
                "type": "number",
                "minimum": 1
              }
            }
          },
          "required": ["number", "description"]
        },
        "minItems": 1
      },
      "nutrition": {
        "type": "object",
        "properties": {
          "calories": {
            "type": "number",
            "minimum": 0
          },
          "fat": {
            "type": "number",
            "minimum": 0
          },
          "carbs": {
            "type": "number",
            "minimum": 0
          },
          "protein": {
            "type": "number",
            "minimum": 0
          }
        }
      },
      "isVegetarian": {
        "type": "boolean"
      },
      "isVegan": {
        "type": "boolean"
      },
      "isGlutenFree": {
        "type": "boolean"
      }
    },
    "required": [
      "recipeId",
      "title",
      "description",
      "prepTime",
      "cookTime",
      "totalTime",
      "servings",
      "ingredients",
      "steps"
    ]
  }

  // In a real endpoint, template metadata would be pulled from the database
  const templateMetadata = {
    systemPrompt: 'Generate a recipe. Follow the schema exactly.'
  }

  // In a real endpoint, this would come from the request body
  const userRequestData = {
    prompt: 'Ice cream',
    templateId: 1
  }

  console.log('Simulating API request to process a prompt using a template...')
  console.log('User prompt:', userRequestData.prompt)
  console.log('Template ID:', userRequestData.templateId)
  console.log('---------------------------------------------------')

  try {
    // This simulates the core logic of the AI endpoint - process the prompt with the template
    const response = await aiService.processTemplatePrompt(
      userRequestData.prompt,
      templateSchema,
      templateMetadata.systemPrompt
    )

    // In a real endpoint, this would be the response processing logic
    if (response.isValid) {
      // Similar to how the AI router would handle a successful response
      console.log('API Response (status 200):')
      console.log({
        success: true,
        data: {
          result: response.parsedData,
          requiredValidation: false,
        }
      })

      console.log('\nFINAL VALIDATION RESULT:')
      console.log('============================================================')
    } else {
      // Similar to how the AI router would handle an invalid JSON response
      console.log('API Response (status 200, but response needs validation):')
      console.log({
        success: true,
        data: {
          result: {
            rawText: response.rawResponse,
            message: 'AI response could not be parsed as valid JSON.',
          },
          requiredValidation: true,
        }
      })

      if (response.validationErrors) {
        console.log('Validation errors that would be logged:')
        console.log(response.validationErrors)
      }
    }

    // In production this would be logged for debugging purposes
    console.log('---------------------------------------------------')
    console.log('Raw AI response:')
    console.log(response.rawResponse)

    // Final summary for quick reference
    console.log('---------------------------------------------------')
    console.log('SUMMARY:')
    console.log(`✓ Response JSON valid: ${response.isValid ? 'YES' : 'NO'}`)
    console.log(`✓ Total tokens used: ${response.tokenUsage?.totalTokens || 0}`)
    console.log(`✓ Cost of this generation: $${((response.tokenUsage?.totalTokens || 0) * 0.00015 / 1000).toFixed(6)} USD`)
    console.log(`✓ Is script correct: ${response.isValid ? 'YES' : 'NO'}`)
    console.log('---------------------------------------------------')
  } catch (error) {
    // This simulates how errors would be handled in the real endpoint
    console.error('Error in AI service:')
    console.error(error)

    // In a real endpoint, this would return a 500 response
    console.log('API Response (status 500):')
    console.log({
      success: false,
      error: 'Internal server error',
    })
  }
}

// Run the main function
main().catch((error: unknown) => {
  console.error('Unhandled error in script execution:', error)
  process.exit(1)
})
