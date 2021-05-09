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
      width: 600,
      height: 700,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills" }]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];

    // Prepare items.
    if (this.actor.data.type == 'character') {
      this._prepareCharacterItems(data);
      this._prepareCharacterHealth(data);
      this._prepareCharacterInit(data);
      this._prepareCharacterSkills(data);
    }

    console.warn('data', data);

    return data;
  }

  /**
   * Update health stats.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterHealth(sheetData) {
    const actorData = sheetData.actor;

    const race = actorData.data.attributes.race;
    const races = actorData.data.races;

    const caracts = actorData.data.caracts;
    const safe = actorData.data.healthLevels.safe;
    const injured = actorData.data.healthLevels.injured;
    const seriously = actorData.data.healthLevels.seriously;
    const underdeath = actorData.data.healthLevels.underdeath;

    // Assign and return
    safe.max = 2;
    injured.max = 2;
    seriously.max = 2;
    underdeath.max = 2;

    if (race === races[1].code
      || race === races[4].code) {
      seriously.max = 1;
    }
    if (race === races[2].code
      || race === races[5].code) {
      seriously.max = 3;
    }

    if (caracts.vig.value === 1) {
      safe.max = 1;
    } else if (caracts.vig.value === 5) {
      safe.max = 3;
    }

    actorData.data.health.max = safe.max + injured.max + seriously.max + underdeath.max;

    if (actorData.data.health.value < underdeath.max) {
      actorData.data.health.indic = underdeath.name;
      safe.value = 0;
      injured.value = 0;
      seriously.value = 0;
      underdeath.value = actorData.data.health.value;
    } else if (actorData.data.health.value < underdeath.max + seriously.max) {
      actorData.data.health.indic = seriously.name;
      safe.value = 0;
      injured.value = 0;
      seriously.value = actorData.data.health.value - underdeath.max;
      underdeath.value = underdeath.max;
    } else if (actorData.data.health.value < underdeath.max + seriously.max + injured.max) {
      actorData.data.health.indic = injured.name;
      safe.value = 0;
      injured.value = actorData.data.health.value - underdeath.max - seriously.max;
      seriously.value = seriously.max;
      underdeath.value = underdeath.max;
    } else {
      actorData.data.health.indic = safe.name;
      safe.value = actorData.data.health.value - underdeath.max - seriously.max - injured.max;
      injured.value = injured.max;
      seriously.value = seriously.max;
      underdeath.value = underdeath.max;
    }
  }

  /**
   * Update init stats.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterInit(sheetData) {
    const actorData = sheetData.actor;

    const hab = actorData.data.caracts.hab;
    const int = actorData.data.caracts.int;

    // Assign and return
    actorData.data.init = hab.value + int.value;
  }

  /**
   * Update skills images.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterSkills(sheetData) {
    const actorData = sheetData.actor;

    // Assign and return
    const skills = actorData.data.skills;
    Object.keys(skills).forEach(key => {
      const skill = skills[key];
      skill.img = {};
      skill.caracts.forEach(caract => {
        skill.img[caract] = "systems/arlenor/assets/icons/skill_" + key + "_" + caract + ".png";
      });
    });
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterItems(sheetData) {
    const actorData = sheetData.actor;

    // Initialize containers.
    const gear = [];
    const features = [];
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: []
    };

    // Iterate through items, allocating to containers
    // let totalWeight = 0;
    for (let i of sheetData.items) {
      let item = i.data;
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.data.spellLevel != undefined) {
          spells[i.data.spellLevel].push(i);
        }
      }
    }

    // Assign and return
    actorData.gear = gear;
    actorData.features = features;
    actorData.spells = spells;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Rollable caracts and skills.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.owner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        if (!li.classList.contains("no-drag")) {
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
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    // Finally, create the item!
    return this.actor.createOwnedItem(itemData);
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

    // Application des malus de vie
    const race = this.actor.data.data.attributes.race;
    const races = this.actor.data.data.races;

    const caracts = this.actor.data.data.caracts;
    const injured = this.actor.data.data.healthLevels.injured;
    const seriously = this.actor.data.data.healthLevels.seriously;
    const underdeath = this.actor.data.data.healthLevels.underdeath;

    // Re-calcul des max et des valeurs réelles (car données du template, pas du sheet)
    injured.max = 2;
    seriously.max = 2;
    underdeath.max = 2;

    if (race === races[1].code
      || race === races[4].code) {
      seriously.max = 1;
    }
    if (race === races[2].code
      || race === races[5].code) {
      seriously.max = 3;
    }

    if (this.actor.data.data.health.value < underdeath.max) {
      caracts.vig.realvalue = Math.max(caracts.vig.value - 3, 0);
      caracts.hab.realvalue = Math.max(caracts.hab.value - 3, 0);
      caracts.int.realvalue = Math.max(caracts.int.value - 3, 0);
      caracts.cha.realvalue = Math.max(caracts.cha.value - 3, 0);
      caracts.pou.realvalue = Math.max(caracts.pou.value - 3, 0);
    } else if (this.actor.data.data.health.value < underdeath.max + seriously.max) {
      caracts.vig.realvalue = Math.max(caracts.vig.value - 2, 0);
      caracts.hab.realvalue = Math.max(caracts.hab.value - 2, 0);
      caracts.int.realvalue = Math.max(caracts.int.value - 2, 0);
      caracts.cha.realvalue = Math.max(caracts.cha.value - 2, 0);
      caracts.pou.realvalue = Math.max(caracts.pou.value - 2, 0);
    } else if (this.actor.data.data.health.value < underdeath.max + seriously.max + injured.max) {
      caracts.vig.realvalue = Math.max(caracts.vig.value - 1, 0);
      caracts.hab.realvalue = Math.max(caracts.hab.value - 1, 0);
      caracts.int.realvalue = Math.max(caracts.int.value - 1, 0);
      caracts.cha.realvalue = Math.max(caracts.cha.value - 1, 0);
      caracts.pou.realvalue = Math.max(caracts.pou.value - 1, 0);
    } else {
      caracts.vig.realvalue = caracts.vig.value;
      caracts.hab.realvalue = caracts.hab.value;
      caracts.int.realvalue = caracts.int.value;
      caracts.cha.realvalue = caracts.cha.value;
      caracts.pou.realvalue = caracts.pou.value;
    }

    if (dataset.roll) {
      let roll = new Roll(dataset.roll, this.actor.data.data);
      let label = dataset.label ? `Lance ${dataset.label}` : '';
      roll.roll().toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label
      });
    }
  }
}
