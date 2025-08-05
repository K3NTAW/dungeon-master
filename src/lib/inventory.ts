/* eslint-disable @typescript-eslint/no-explicit-any */

export interface InventoryItem {
  name: string;
  quantity?: number;
  description?: string;
  value?: number;
}

export interface InventoryUpdate {
  inventory_add?: string[];
  inventory_remove?: string[];
  inventory?: any;
  inventory_edit?: Record<string, string>; // For quantity edits like "pouch (10)" -> "pouch (5)"
}

/**
 * Smart inventory management functions
 */
export class InventoryManager {
  /**
   * Parse item with quantity from string (e.g., "pouch (10)" -> {name: "pouch", quantity: 10})
   */
  static parseItemWithQuantity(itemString: string): { name: string; quantity: number } | null {
    const match = itemString.match(/^(.+?)\s*\((\d+)\)$/);
    if (match) {
      return {
        name: match[1].trim(),
        quantity: parseInt(match[2], 10)
      };
    }
    return null;
  }

  /**
   * Format item with quantity (e.g., {name: "pouch", quantity: 5} -> "pouch (5)")
   */
  static formatItemWithQuantity(name: string, quantity: number): string {
    return `${name} (${quantity})`;
  }

  /**
   * Process inventory updates intelligently
   * @param currentInventory - Current inventory array
   * @param updates - Updates containing inventory_add, inventory_remove, or inventory_edit
   * @returns Processed inventory array
   */
  static processInventoryUpdates(currentInventory: any[], updates: InventoryUpdate): any[] {
    let inventory = Array.isArray(currentInventory) ? [...currentInventory] : [];
    
    // Handle quantity edits first (e.g., "pouch (10)" -> "pouch (5)")
    if (updates.inventory_edit && typeof updates.inventory_edit === 'object') {
      Object.entries(updates.inventory_edit).forEach(([oldItem, newItem]) => {
        const oldParsed = this.parseItemWithQuantity(oldItem);
        const newParsed = this.parseItemWithQuantity(newItem);
        
        if (oldParsed && newParsed && oldParsed.name === newParsed.name) {
          // Find and replace the item with new quantity
          const itemIndex = inventory.findIndex(item => {
            const parsed = this.parseItemWithQuantity(item);
            return parsed && parsed.name === oldParsed.name;
          });
          
          if (itemIndex !== -1) {
            if (newParsed.quantity > 0) {
              inventory[itemIndex] = this.formatItemWithQuantity(newParsed.name, newParsed.quantity);
            } else {
              // Remove item if quantity is 0 or negative
              inventory.splice(itemIndex, 1);
            }
          }
        }
      });
    }
    
    // Add new items
    if (updates.inventory_add && Array.isArray(updates.inventory_add)) {
      inventory = [...inventory, ...updates.inventory_add];
    }
    
    // Remove specific items
    if (updates.inventory_remove && Array.isArray(updates.inventory_remove)) {
      inventory = inventory.filter(item => 
        !updates.inventory_remove!.includes(item)
      );
    }
    
    return inventory;
  }

  /**
   * Add items to inventory with quantity tracking
   * @param currentInventory - Current inventory array
   * @param itemsToAdd - Items to add
   * @returns Updated inventory array
   */
  static addItems(currentInventory: any[], itemsToAdd: string[]): any[] {
    const inventory = Array.isArray(currentInventory) ? [...currentInventory] : [];
    return [...inventory, ...itemsToAdd];
  }

  /**
   * Remove specific items from inventory
   * @param currentInventory - Current inventory array
   * @param itemsToRemove - Items to remove
   * @returns Updated inventory array
   */
  static removeItems(currentInventory: any[], itemsToRemove: string[]): any[] {
    const inventory = Array.isArray(currentInventory) ? [...currentInventory] : [];
    return inventory.filter(item => !itemsToRemove.includes(item));
  }

  /**
   * Edit item quantities in inventory
   * @param currentInventory - Current inventory array
   * @param edits - Object mapping old items to new items (e.g., {"pouch (10)": "pouch (5)"})
   * @returns Updated inventory array
   */
  static editItemQuantities(currentInventory: any[], edits: Record<string, string>): any[] {
    return this.processInventoryUpdates(currentInventory, { inventory_edit: edits });
  }

  /**
   * Check if inventory contains specific items
   * @param inventory - Inventory array
   * @param items - Items to check for
   * @returns Object with item names as keys and boolean values
   */
  static hasItems(inventory: any[], items: string[]): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    items.forEach(item => {
      const parsed = this.parseItemWithQuantity(item);
      if (parsed) {
        // Check for items with quantities
        result[item] = inventory.some(invItem => {
          const invParsed = this.parseItemWithQuantity(invItem);
          return invParsed && invParsed.name === parsed.name && invParsed.quantity >= parsed.quantity;
        });
      } else {
        // Check for exact item match
        result[item] = inventory.includes(item);
      }
    });
    return result;
  }

  /**
   * Get inventory summary for display
   * @param inventory - Inventory array
   * @returns Formatted inventory string
   */
  static formatInventory(inventory: any[]): string {
    if (!Array.isArray(inventory) || inventory.length === 0) {
      return 'Empty';
    }
    
    // Count items
    const itemCounts: Record<string, number> = {};
    inventory.forEach(item => {
      const parsed = this.parseItemWithQuantity(item);
      if (parsed) {
        // Item already has quantity
        itemCounts[parsed.name] = (itemCounts[parsed.name] || 0) + parsed.quantity;
      } else {
        // Regular item
        itemCounts[item] = (itemCounts[item] || 0) + 1;
      }
    });
    
    // Format with counts
    return Object.entries(itemCounts)
      .map(([item, count]) => count > 1 ? `${item} (${count})` : item)
      .join('\n');
  }
} 