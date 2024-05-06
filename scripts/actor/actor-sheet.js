import { rollSkill } from "./../arlenor.js";
import bonusMalusList from "./../../models/bonusMalusList.json" assert { type: "json" };
import difficulties from "./../../models/difficulties.json" assert { type: "json" };
import divinities from "./../../models/divinities.json" assert { type: "json" };
import durations from "./../../models/durations.json" assert { type: "json" };
import equipmentTypes from "./../../models/equipmentTypes.json" assert { type: "json" };
import families from "./../../models/families.json" assert { type: "json" };
import itemTypes from "./../../models/itemTypes.json" assert { type: "json" };
import powerTypes from "./../../models/powerTypes.json" assert { type: "json" };
import races from "./../../models/races.json" assert { type: "json" };
import ranges from "./../../models/ranges.json" assert { type: "json" };
import ranks from "./../../models/ranks.json" assert { type: "json" };
import specialities from "./../../models/specialities.json" assert { type: "json" };
import skillTypes from "./../../models/skillTypes.json" assert { type: "json" };

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class ArlenorActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["arlenor", "sheet", "actor"],
      template: "systems/arlenor/templates/actor/actor-sheet.hbs",
      width: 620,
      height: 700,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "powers" }]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const baseData = super.getData();
    baseData.dtypes = ["String", "Number", "Boolean"];

    // Prepare items
    if (baseData.actor.type == 'character') {
      this._prepareCharacterHealth(baseData.actor, true);
      this._prepareCharacterItems(baseData.actor);
    }
    if (baseData.actor.type == 'creature') {
      this._prepareCharacterHealth(baseData.actor, false);
      this._prepareCharacterItems(baseData.actor);
    }

    const healthStats = this._getHealthStats(baseData.actor.system.health);
    const enrichedBiography = await TextEditor.enrichHTML(this.actor.system.biography, { async: true });

    // Return data for the "actor-sheet.hbs"
    let sheetData = {
      editable: this.isEditable,
      actor: this.actor,
      system: this.actor.system,
      healthIndic: healthStats.indic,
      healthLevels: healthStats.levels,
      enrichedBiography,
      difficulties,
      divinities,
      durations,
      equipmentTypes,
      families,
      itemTypes,
      powerTypes,
      races,
      ranges,
      ranks,
      skillTypes,
      specialities
    };

    return sheetData;
  }

  /**
   * Update health stats.
   *
   * @param {Object} actor The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterHealth(actor, isPJ = false) {
    const data = actor.system;
    const caracts = data.caracts;

    if (isPJ) {
      data.health.max = 5 + Math.floor(data.level / 2);
      const race = data.race;
      if (race === races[1].code
        || race === races[4].code) {
        data.health.max += 1;
      }
    } else {
      data.health.max = 5;
    }

    if (caracts.ten.value === 1) {
      data.health.max -= 1;
    } else if (caracts.ten.value > 3) {
      data.health.max += 1;
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actor The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterItems(actor) {
    // Initialize containers
    const equipments = {};
    equipmentTypes.forEach(equipement => {
      equipments[equipement.code] = [];
    });
    const backpack = [];
    const skills = [];
    const powers = [];
    const otherPowers = [];

    // Iterate through items, allocating to containers
    for (let i of actor.items) {
      i.img = i.img || DEFAULT_TOKEN;
      if (i.type === 'equipment') {
        const code = i.system.equipmentType;
        if (code && equipments[code]) {
          equipments[code].push(i);
        }
      }
      else if (i.type === 'item') {
        backpack.push(i);
      }
      else if (i.type === 'skill') {
        skills.push(i);
      }
      else if (i.type === 'power') {
        if (i.system.powerType === "EVO") powers.push(i);
        else otherPowers.push(i);
      }
    }

    backpack.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    skills.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    powers.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    otherPowers.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    // Assign and return
    actor.equipments = equipments;
    actor.backpack = backpack;
    actor.skills = skills;
    actor.powers = powers;
    actor.otherPowers = otherPowers;
  }

  /**
   * Update health stats.
   *
   * @param {Object} actor The actor to prepare.
   *
   * @return {undefined}
   */
  _getHealthStats(health) {
    let indic;
    const safe = { value: 0, max: 1 };
    const injured = { value: 0, max: (health.max - 2) };
    const underdeath = { value: 0, max: 1 };

    if (health.value === 0) {
      indic = "Décédé";
      safe.value = 0;
      injured.value = 0;
      underdeath.value = 0;
    } else if (health.value <= underdeath.max) {
      indic = "Au seuil de la mort";
      safe.value = 0;
      injured.value = 0;
      underdeath.value = health.value;
    } else if (health.value <= underdeath.max + injured.max) {
      indic = "Blessé";
      safe.value = 0;
      injured.value = health.value - underdeath.max;
      underdeath.value = underdeath.max;
    } else {
      indic = "Indemne";
      safe.value = health.value - underdeath.max - injured.max;
      injured.value = injured.max;
      underdeath.value = underdeath.max;
    }

    return { indic, levels: [underdeath, injured, safe] };
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Modify inline Inventory Item
    html.find('.inline-edit-check').click(this._onItemModifyCheck.bind(this));
    html.find('.inline-edit-value').change(this._onItemModifyValue.bind(this));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteEmbeddedDocuments("Item", [li.data("itemId")]);
      li.slideUp(200, () => this.render(false));
    });

    // Rollable caracts and skills.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        if (li.classList.contains("with-drag")) {
          li.setAttribute("draggable", true);
          li.addEventListener("dragstart", handler, false);
        }
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const system = duplicate(header.dataset);
    if (system.powertype) {
      system.powerType = system.powertype;
      delete system["powertype"];
    }
    // Initialize a default name.
    const name = `${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: system,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  _onItemModifyCheck(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest(".item").dataset.itemId;
    let item = this.actor.items.get(itemId);
    let field = element.dataset.field;
    return item.update({ [field]: element.checked });
  }

  _onItemModifyValue(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest(".item").dataset.itemId;
    let item = this.actor.items.get(itemId);
    let field = element.dataset.field;
    return item.update({ [field]: element.value });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const data = {
      actor: this.actor,
      difficulties,
      powerId: dataset.powerid,
      caractName: this.actor.system?.caracts[dataset.caractkey].name,
      caractKey: dataset.caractkey,
      caractValue: this.actor.system?.caracts[dataset.caractkey].value,
      bonusMalusList,
    }
    rollSkill(data);
  }
}
