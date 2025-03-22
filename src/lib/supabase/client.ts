import { createClient } from "@supabase/supabase-js";
import { envConfig } from "../../config/env.config";
import { v4 as uuidv4 } from "uuid";

// Initialize the Supabase client
export const supabaseClient = createClient(
  envConfig.supabase.url,
  // Use anon key for client-side operations (limited permissions)
  envConfig.supabase.anonKey
);

// Create a separate client with service role for server operations that need more permissions
// Typically used in secure environments like serverless functions
export const getServiceClient = () => {
  if (!envConfig.supabase.serviceRoleKey) {
    throw new Error("Supabase service role key not available");
  }
  
  return createClient(
    envConfig.supabase.url,
    envConfig.supabase.serviceRoleKey
  );
};

// Type definitions for the data structures
export type CharacterData = {
  name: string;
  interests?: string;
  age?: number;
  looks?: string;
  character_prompt?: string;
};

export type StoryInputData = {
  plot_idea: string;
  main_character?: CharacterData;
};

/**
 * Stores only story, character, and story input data in the database without analytics.
 * Creates a story record if it doesn't exist and adds related data.
 * 
 * @param storyInputData - Story input data for the story_inputs table
 * @param characterData - Character data for the characters table
 * @param storyId - Optional existing story ID (creates new one if not provided)
 * @param userId - Optional user ID (uses default if not provided)
 * @returns Object containing success status and IDs
 */
export async function storeStoryData(
  storyInputData: StoryInputData,
  characterData?: CharacterData,
  storyId?: string,
  userId: string = "ca5f8a12-ba36-4a82-9a9f-115336a2218e" // Default user ID
): Promise<{ 
  success: boolean; 
  storyId?: string; 
  characterId?: string;
  storyInputId?: string;
  error?: string 
}> {
  try {
    // Use the service role client for elevated permissions
    const serviceClient = getServiceClient();
    
    // Generate or use provided story ID
    const actualStoryId = storyId || uuidv4();
    
    // Create story record if ID not provided (meaning it doesn't exist yet)
    if (!storyId) {
      const { error: storyError } = await serviceClient
        .from("stories")
        .insert({
          id: actualStoryId,
          status: "input_generated",
          user_id: userId,
          title: `Story ${new Date().toISOString().split('T')[0]}`
        });
        
      if (storyError) throw new Error(`Failed to create story: ${storyError.message}`);
      
      console.log(`Created story with ID: ${actualStoryId}`);
    }
    
    // Initialize return variables
    let characterId: string | undefined;
    let storyInputId: string | undefined;
    
    // Create character record if data is provided
    if (characterData) {
      characterId = uuidv4();
      const { error: characterError } = await serviceClient
        .from("characters")
        .insert({
          id: characterId,
          story_id: actualStoryId,
          name: characterData.name,
          interests: characterData.interests || null,
          age: characterData.age || null,
          looks: characterData.looks || null,
          character_prompt: characterData.character_prompt || null,
          created_at: new Date().toISOString()
        });
        
      if (characterError) throw new Error(`Failed to create character: ${characterError.message}`);
      
      console.log(`Created character with ID: ${characterId} for story ID: ${actualStoryId}`);
    }
    
    // Create story_inputs record
    storyInputId = uuidv4();
    const mainCharacterId = characterId; // Use the character we just created, if any
    
    const { error: storyInputError } = await serviceClient
      .from("story_inputs")
      .insert({
        id: storyInputId,
        story_id: actualStoryId,
        plot_idea: storyInputData.plot_idea,
        main_character_id: mainCharacterId || null,
        created_at: new Date().toISOString()
      });
      
    if (storyInputError) throw new Error(`Failed to create story input: ${storyInputError.message}`);
    
    console.log(`Created story input with ID: ${storyInputId} for story ID: ${actualStoryId}`);
    
    return {
      success: true,
      storyId: actualStoryId,
      characterId,
      storyInputId
    };
  } catch (error) {
    console.error("Error storing story data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Extracts and stores story data from Vapi call data.
 * This function should be called when a call ends.
 * Only uses structured data, without falling back to transcript extraction.
 * 
 * @param callData - Complete call data from the Vapi API
 * @param storyId - Optional existing story ID
 * @returns Object containing success status and IDs
 */
export async function storeCallStoryData(
  callData: any,
  storyId?: string
): Promise<{ 
  success: boolean; 
  storyId?: string; 
  characterId?: string;
  storyInputId?: string;
  error?: string 
}> {
  try {
    console.log("Processing call data to extract story information");
    
    // Extract structuredData only from analysis field
    const structuredData = callData.analysis?.structuredData || {};
    
    const hasStructuredData = Object.keys(structuredData).length > 0;
    console.log(`Structured data ${hasStructuredData ? "found" : "not found"} in analysis field`);
    
    if (!hasStructuredData) {
      console.log("No structured data available in analysis field, skipping storage");
      return {
        success: false,
        error: "No structured data available in the analysis field"
      };
    }
    
    console.log("Structured data from analysis:", structuredData);
    
    // Extract character data based on the schema
    let characterData: CharacterData | undefined;
    let storyInputData: StoryInputData;
    
    // Try different possible locations for character data
    if (structuredData.MainCharacter) {
      console.log("Found MainCharacter in structured data");
      const char = structuredData.MainCharacter;
      characterData = {
        name: char.name || "Unknown Character",
        interests: char.interests || undefined,
        age: typeof char.age === "number" ? char.age : 
             (typeof char.age === "string" ? parseInt(char.age) : undefined),
        looks: char.looks || undefined,
        character_prompt: undefined
      };
    } else if (structuredData.Character || structuredData.character) {
      console.log("Found Character/character in structured data");
      const char = structuredData.Character || structuredData.character;
      characterData = {
        name: char.name || "Unknown Character",
        interests: char.interests || undefined,
        age: typeof char.age === "number" ? char.age : 
             (typeof char.age === "string" ? parseInt(char.age) : undefined),
        looks: char.looks || char.description || undefined,
        character_prompt: char.prompt || char.character_prompt || undefined
      };
    } else if (structuredData.mainCharacter || structuredData.main_character) {
      console.log("Found mainCharacter/main_character in structured data");
      const char = structuredData.mainCharacter || structuredData.main_character;
      characterData = {
        name: char.name || "Unknown Character",
        interests: char.interests || undefined,
        age: typeof char.age === "number" ? char.age : 
             (typeof char.age === "string" ? parseInt(char.age) : undefined),
        looks: char.looks || char.description || undefined,
        character_prompt: char.prompt || char.character_prompt || undefined
      };
    }
    
    if (characterData) {
      console.log("Extracted character data:", characterData);
    } else {
      console.log("No character data found in structured data");
      // Skip if no character data is found
      return {
        success: false,
        error: "No character data found in structured data"
      };
    }
    
    // Extract plot idea with fallbacks
    const plotIdea = structuredData.story_idea || 
                    structuredData.storyIdea ||
                    structuredData.plotIdea || 
                    structuredData.plot_idea ||
                    structuredData.plot || 
                    structuredData.story;
    
    if (!plotIdea) {
      console.log("No plot idea found in structured data");
      return {
        success: false,
        error: "No plot idea found in structured data"
      };
    }
    
    // Create story input data
    storyInputData = {
      plot_idea: plotIdea,
      main_character: characterData
    };

    console.log("Extracted story data:", {
      plotIdea: plotIdea.substring(0, 100) + (plotIdea.length > 100 ? "..." : ""),
      characterName: characterData?.name
    });
    
    // Use the main storeStoryData function to store the data
    return await storeStoryData(storyInputData, characterData, storyId);
  } catch (error) {
    console.error("Error storing call story data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
