/*!
 * This file is part of Aloha Editor
 * Author & Copyright (c) 2010 Gentics Software GmbH, aloha@gentics.com
 * Licensed unter the terms of http://www.aloha-editor.com/license.html
 */
(function(window, undefined) {
	"use strict";
	var
		jQuery = window.alohaQuery, $ = jQuery,
		GENTICS = window.GENTICS,
		Aloha = window.Aloha,
		Class = window.Class;

/**
 * Markup object
 */
Aloha.Markup = Class.extend({
	/**
	 * Key handlers for special key codes
	 */
	keyHandlers: {},

	/**
	 * Add a key handler for the given key code
	 * @param keyCode key code
	 * @param handler handler function
	 */
	addKeyHandler: function (keyCode, handler) {
		if (!this.keyHandlers[keyCode]) {
			this.keyHandlers[keyCode] = [];
		}

		this.keyHandlers[keyCode].push(handler);
	},

	insertBreak: function () {
		var range = Aloha.Selection.rangeObject,nonWSIndex,nextTextNode,newBreak;
		if (!range.isCollapsed()) {
			this.removeSelectedMarkup();
		}

		newBreak = jQuery('<br/>');
		GENTICS.Utils.Dom.insertIntoDOM(newBreak, range, Aloha.activeEditable.obj);

		nextTextNode = GENTICS.Utils.Dom.searchAdjacentTextNode(newBreak.parent().get(0), GENTICS.Utils.Dom.getIndexInParent(newBreak.get(0)) + 1, false);
		if (nextTextNode) {
			// trim leading whitespace
			nonWSIndex = nextTextNode.data.search(/\S/);
			if (nonWSIndex > 0) {
				nextTextNode.data = nextTextNode.data.substring(nonWSIndex);
			}
		}

		range.startContainer = range.endContainer = newBreak.get(0).parentNode;
		range.startOffset = range.endOffset = GENTICS.Utils.Dom.getIndexInParent(newBreak.get(0)) + 1;
		range.correctRange();
		range.clearCaches();
		range.select();
	},

	/**
	 * first method to handle key strokes
	 * @param event DOM event
	 * @param rangeObject as provided by Aloha.Selection.getRangeObject();
	 * @return "Aloha.Selection"
	 */
	preProcessKeyStrokes: function(event) {
		if (event.type != 'keydown') {
			return false;
		}

		var rangeObject = Aloha.Selection.rangeObject,
			handlers,
			i;

		if (this.keyHandlers[event.keyCode]) {
			handlers = this.keyHandlers[event.keyCode];
			for ( i = 0; i < handlers.length; ++i) {
				if (!handlers[i](event)) {
					return false;
				}
			}
		}

		// ENTER
		if  (event.keyCode === 13 ) {
			if (event.shiftKey) {
				Aloha.Log.debug(this, '... got a smoking Shift+Enter, Cowboy');
				// when the range is expanded, we remove the selected text
				if (!rangeObject.isCollapsed()) {
					this.removeSelectedMarkup();
				}

				Aloha.Selection.updateSelection(false, true);
				this.processShiftEnter(rangeObject);

//				this.insertBreak();

				return false;
			}
			else {
				Aloha.Log.debug(this, '... got a lonely Enter, Mum');
				if (!rangeObject.isCollapsed()) {
					this.removeSelectedMarkup();
				}
				Aloha.Selection.updateSelection(false, true);
				this.processEnter(rangeObject);

/*
				// next find the nearest enclosing split object
				var splitObject = rangeObject.findMarkup(function() {
					return GENTICS.Utils.Dom.isSplitObject(this);
				}, Aloha.activeEditable.obj);

				// if one found, split it, otherwise insert a break
				if (splitObject) {
					var splitResult = GENTICS.Utils.Dom.split(rangeObject, jQuery([splitObject.parentNode, Aloha.activeEditable.obj.get(0)]));
					if (splitResult) {
						// cleanup in the second part
						GENTICS.Utils.Dom.doCleanup({'merge' : true, 'removeempty' : true}, rangeObject, splitResult.get(1));

						// get the first text node in the second part of the split
						var nextTextNode = GENTICS.Utils.Dom.searchAdjacentTextNode(splitResult.get(1), 0, false);
						if (nextTextNode) {
							// trim leading whitespace
							var nonWSIndex = nextTextNode.data.search(/\S/);
							if (nonWSIndex > 0) {
								nextTextNode.data = nextTextNode.data.substring(nonWSIndex);
							}
						}

						// check whether the split created an element which is empty and needs to have an element to be visible
						if (GENTICS.Utils.Dom.isEmpty(splitResult.get(0))) {
							splitResult.eq(0).append(this.getFillUpElement(splitResult.get(0)));
						}
						if (GENTICS.Utils.Dom.isEmpty(splitResult.get(1))) {
							splitResult.eq(1).append(this.getFillUpElement(splitResult.get(1)));
						}

						rangeObject.startContainer = rangeObject.endContainer = splitResult.get(1);
						rangeObject.startOffset = rangeObject.endOffset = 0;
						rangeObject.correctRange();
						rangeObject.clearCaches();
						rangeObject.select();
					} else {
						this.insertBreak();
					}
				} else {
					this.insertBreak();
				}
*/

				return false;
			}
		}
		return true;
	},

	/**
	 * method handling shiftEnter
	 * @param Aloha.Selection.SelectionRange of the current selection
	 * @return void
	 */
	processShiftEnter: function(rangeObject) {
		this.insertHTMLBreak(rangeObject.getSelectionTree(), rangeObject);
	},

	/**
	 * method handling Enter
	 * @param Aloha.Selection.SelectionRange of the current selection
	 * @return void
	 */
	processEnter: function(rangeObject) {
		if (rangeObject.splitObject) {
			// now comes a very evil hack for ie, when the enter is pressed in a text node in an li element, we just append an empty text node
	//		if (jQuery.browser.msie
	//				&& GENTICS.Utils.Dom
	//						.isListElement(rangeObject.splitObject)) {
	//			jQuery(rangeObject.splitObject).append(
	//					jQuery(document.createTextNode('')));
	//		}

			this.splitRangeObject(rangeObject);
		} else { // if there is no split object, the Editable is the paragraph type itself (e.g. a p or h2)
			this.insertHTMLBreak(rangeObject.getSelectionTree(), rangeObject);
		}
	},

	/**
	 * Insert the given html markup at the current selection
	 * @param html html markup to be inserted
	 */
	insertHTMLCode: function (html) {
		var rangeObject = Aloha.Selection.rangeObject;

		this.insertHTMLBreak(rangeObject.getSelectionTree(), rangeObject, jQuery(html));
	},

	/**
	 * insert an HTML Break <br /> into current selection
	 * @param Aloha.Selection.SelectionRange of the current selection
	 * @return void
	 */
	insertHTMLBreak: function(selectionTree, rangeObject, inBetweenMarkup) {
		var i, treeLength, el, jqEl, jqElBefore, jqElAfter, tmpObject, offset, checkObj;

		inBetweenMarkup = inBetweenMarkup ? inBetweenMarkup: jQuery('<br/>');
		for ( i = 0, treeLength = selectionTree.length; i < treeLength; i++) {
			el = selectionTree[i];
			jqEl = el.domobj ? jQuery(el.domobj) : undefined;
			if (el.selection !== 'none') { // before cursor, leave this part inside the splitObject
				if (el.selection == 'collapsed') {
					// collapsed selection found (between nodes)
					if (i > 0) {
						// not at the start, so get the element to the left
						jqElBefore = jQuery(selectionTree[i-1].domobj);
						// and insert the break after it
						jqElBefore.after(inBetweenMarkup);
					} else {
						// at the start, so get the element to the right
						jqElAfter = jQuery(selectionTree[1].domobj);
						// and insert the break before it
						jqElAfter.before(inBetweenMarkup);
					}

					// now set the range
					rangeObject.startContainer = rangeObject.endContainer = inBetweenMarkup[0].parentNode;
					rangeObject.startOffset = rangeObject.endOffset = GENTICS.Utils.Dom.getIndexInParent(inBetweenMarkup[0]) + 1;
					rangeObject.correctRange();
				} else if (el.domobj && el.domobj.nodeType === 3) { // textNode
					// when the textnode is immediately followed by a blocklevel element (like p, h1, ...) we need to add an additional br in between
					if (el.domobj.nextSibling
							&& el.domobj.nextSibling.nodeType == 1
							&& Aloha.Selection.replacingElements[el.domobj.nextSibling.nodeName
									.toLowerCase()]) {
						// TODO check whether this depends on the browser
						jqEl.after('<br/>');
					}

					if (this.needEndingBreak()) {
						// when the textnode is the last inside a blocklevel element
						// (like p, h1, ...) we need to add an additional br as very
						// last object in the blocklevel element
						checkObj = el.domobj;
						while (checkObj) {
							if (checkObj.nextSibling) {
								checkObj = false;
							} else {
								// go to the parent
								checkObj = checkObj.parentNode;
								// found a blocklevel element, we are done
								if (GENTICS.Utils.Dom.isBlockLevelElement(checkObj)) {
									break;
								}
								// reached the limit object, we are done
								if (checkObj === rangeObject.limitObject) {
									checkObj = false;
								}
							}
						}
						// when we found a blocklevel element, insert a break at the
						// end. Mark the break so that it is cleaned when the
						// content is fetched.
						if (checkObj) {
							jQuery(checkObj).append('<br class="aloha-cleanme"/>');
						}
					}

					// insert the break
					jqEl.between(inBetweenMarkup, el.startOffset);

					// correct the range
					// count the number of previous siblings
					offset = 0;
					tmpObject = inBetweenMarkup[0];
					while (tmpObject) {
						tmpObject = tmpObject.previousSibling;
						offset++;
					}

					rangeObject.startContainer = inBetweenMarkup[0].parentNode;
					rangeObject.endContainer = inBetweenMarkup[0].parentNode;
					rangeObject.startOffset = offset;
					rangeObject.endOffset = offset;
					rangeObject.correctRange();
				} else if (el.domobj && el.domobj.nodeType === 1) { // other node, normally a break
					if (jqEl.parent().find('br.aloha-ephemera').length === 0) {
						// but before putting it, remove all:
						jQuery(rangeObject.limitObject).find('br.aloha-ephemera').remove();
						//  now put it:
						jQuery(rangeObject.commonAncestorContainer).append(this.getFillUpElement(rangeObject.splitObject));
					}
					jqEl.after(inBetweenMarkup);

					// now set the selection. Since we just added one break do the currect el
					// the new position must be el's position + 1. el's position is the index
					// of the el in the selection tree, which is i. then we must add
					// another +1 because we want to be AFTER the object, not before. therefor +2
					rangeObject.startContainer = rangeObject.commonAncestorContainer;
					rangeObject.endContainer = rangeObject.startContainer;
					rangeObject.startOffset = i+2;
					rangeObject.endOffset = i+2;
					rangeObject.update();
				}
			}
		}
		rangeObject.select();
	},

	/**
	 * Check whether blocklevel elements need breaks at the end to visibly render a newline
	 * @return true if an ending break is necessary, false if not
	 */
	needEndingBreak: function () {
		// currently, all browser except IE need ending breaks
		return !jQuery.browser.msie;
	},

	/**
	 * Get the currently selected text or false if nothing is selected (or the selection is collapsed)
	 * @return selected text
	 */
	getSelectedText: function () {
		var rangeObject = Aloha.Selection.rangeObject;

		if (rangeObject.isCollapsed()) {
			return false;
		}

		return this.getFromSelectionTree(rangeObject.getSelectionTree(), true);
	},

	/**
	 * Recursive function to get the selected text from the selection tree starting at the given level
	 * @param selectionTree array of selectiontree elements
	 * @param astext true when the contents shall be fetched as text, false for getting as html markup
	 * @return selected text from that level (incluiding all sublevels)
	 */
	getFromSelectionTree: function (selectionTree, astext) {
		var text = '', i, treeLength, el, clone;
		for ( i = 0, treeLength = selectionTree.length; i < treeLength; i++) {
			el = selectionTree[i];
			if (el.selection == 'partial') {
				if (el.domobj.nodeType === 3) {
					// partial text node selected, get the selected part
					text += el.domobj.data.substring(el.startOffset, el.endOffset);
				} else if (el.domobj.nodeType === 1 && el.children) {
					// partial element node selected, do the recursion into the children
					if (astext) {
						text += this.getFromSelectionTree(el.children, astext);
					} else {
						// when the html shall be fetched, we create a clone of the element and remove all the children
						clone = jQuery(el.domobj).clone(false).empty();
						// then we do the recursion and add the selection into the clone
						clone.html(this.getFromSelectionTree(el.children, astext));
						// finally we get the html of the clone
						text += clone.outerHTML();
					}
				}
			} else if (el.selection == 'full') {
				if (el.domobj.nodeType === 3) {
					// full text node selected, get the text
					text += jQuery(el.domobj).text();
				} else if (el.domobj.nodeType === 1 && el.children) {
					// full element node selected, get the html of the node and all children
					text += astext ? jQuery(el.domobj).text() : jQuery(el.domobj).outerHTML();
				}
			}
		}

		return text;
	},

	/**
	 * Get the currently selected markup or false if nothing is selected (or the selection is collapsed)
	 * @return selected markup
	 */
	getSelectedMarkup: function () {
		var rangeObject = Aloha.Selection.rangeObject;

		if (rangeObject.isCollapsed()) {
			return false;
		}

		return this.getFromSelectionTree(rangeObject.getSelectionTree(), false);
	},

	/**
	 * Remove the currently selected markup
	 */
	removeSelectedMarkup: function () {
		var rangeObject = Aloha.Selection.rangeObject, newRange;

		if (rangeObject.isCollapsed()) {
			return;
		}

		newRange = new Aloha.Selection.SelectionRange();
		// remove the selection
		this.removeFromSelectionTree(rangeObject.getSelectionTree(), newRange);

		// do a cleanup now (starting with the commonancestorcontainer)
		newRange.update();
		GENTICS.Utils.Dom.doCleanup({'merge' : true, 'removeempty' : true}, Aloha.Selection.rangeObject);
		Aloha.Selection.rangeObject = newRange;

		// need to set the collapsed selection now
		newRange.correctRange();
		newRange.update();
		newRange.select();
		Aloha.Selection.updateSelection();
	},

	/**
	 * Recursively remove the selected items, starting with the given level in the selectiontree
	 * @param selectionTree current level of the selectiontree
	 * @param newRange new collapsed range to be set after the removal
	 */
	removeFromSelectionTree: function (selectionTree, newRange) {
		// remember the first found partially selected element node (in case we need
		// to merge it with the last found partially selected element node)
		var firstPartialElement, newdata, i, el, adjacentTextNode, treeLength;

		// iterate through the selection tree
		for (i = 0, treeLength = selectionTree.length; i < treeLength; i++) {
			el = selectionTree[i];
			// check the type of selection
			if (el.selection == 'partial') {
				if (el.domobj.nodeType === 3) {
					// partial text node selected, so remove the selected portion
					newdata = '';
					if (el.startOffset > 0) {
						newdata += el.domobj.data.substring(0, el.startOffset);
					}
					if (el.endOffset < el.domobj.data.length) {
						newdata += el.domobj.data.substring(el.endOffset, el.domobj.data.length);
					}
					el.domobj.data = newdata;

					// eventually set the new range (if not done before)
					if (!newRange.startContainer) {
						newRange.startContainer = newRange.endContainer = el.domobj;
						newRange.startOffset = newRange.endOffset = el.startOffset;
					}
				} else if (el.domobj.nodeType === 1 && el.children) {
					// partial element node selected, so do the recursion into the children
					this.removeFromSelectionTree(el.children, newRange);
					if (firstPartialElement) {
						// when the first parially selected element is the same type
						// of element, we need to merge them
						if (firstPartialElement.nodeName == el.domobj.nodeName) {
							// merge the nodes
							jQuery(firstPartialElement).append(jQuery(el.domobj).contents());
							// and remove the latter one
							jQuery(el.domobj).remove();
						}
					} else {
						// remember this element as first partially selected element
						firstPartialElement = el.domobj;
					}
				}
			} else if (el.selection == 'full') {
				// eventually set the new range (if not done before)
				if (!newRange.startContainer) {
					adjacentTextNode = GENTICS.Utils.Dom.searchAdjacentTextNode(el.domobj.parentNode, GENTICS.Utils.Dom.getIndexInParent(el.domobj) + 1, false, {'blocklevel' : false});
					if (adjacentTextNode) {
						newRange.startContainer = newRange.endContainer = adjacentTextNode;
						newRange.startOffset = newRange.endOffset = 0;
					} else {
						newRange.startContainer = newRange.endContainer = el.domobj.parentNode;
						newRange.startOffset = newRange.endOffset = GENTICS.Utils.Dom.getIndexInParent(el.domobj) + 1;
					}
				}

				// full node selected, so just remove it (will also remove all children)
				jQuery(el.domobj).remove();
			}
		}
	},

	/**
	 * split passed rangeObject without or with optional markup
	 * @param Aloha.Selection.SelectionRange of the current selection
	 * @param markup object (jQuery) to insert in between the split elements
	 * @return void
	 */
	splitRangeObject: function(rangeObject, markup) {
		// UAAAA: first check where the markup can be inserted... *grrrrr*, then decide where to split
		// object which is split up
		var
			splitObject = jQuery(rangeObject.splitObject),
			selectionTree, insertAfterObject, followUpContainer;

		// update the commonAncestor with the splitObject (so that the selectionTree is correct)
		rangeObject.update(rangeObject.splitObject); // set the splitObject as new commonAncestorContainer and update the selectionTree

		// calculate the selection tree. NOTE: it is necessary to do this before
		// getting the followupcontainer, since getting the selection tree might
		// possibly merge text nodes, which would lead to differences in the followupcontainer
		selectionTree = rangeObject.getSelectionTree();

		// object to be inserted after the splitObject
		followUpContainer = this.getSplitFollowUpContainer(rangeObject);

		// now split up the splitObject into itself AND the followUpContainer
		this.splitRangeObjectHelper(selectionTree, rangeObject, followUpContainer); // split the current object into itself and the followUpContainer

		// check whether the followupcontainer is still marked for removal
		if (followUpContainer.hasClass('preparedForRemoval')) {
			// TODO shall we just remove the class or shall we not use the followupcontainer?
			followUpContainer.removeClass('preparedForRemoval');
		}

		// now let's find the place, where the followUp is inserted afterwards. normally that's the splitObject itself, but in
		// some cases it might be their parent (e.g. inside a list, a <p> followUp must be inserted outside the list)
		insertAfterObject = this.getInsertAfterObject(rangeObject, followUpContainer);

		// now insert the followUpContainer
		jQuery(followUpContainer).insertAfter(insertAfterObject); // attach the followUpContainer right after the insertAfterObject

		// in some cases, we want to remove the "empty" splitObject (e.g. LIs, if enter was hit twice)
		if (rangeObject.splitObject.nodeName.toLowerCase() === 'li' && !Aloha.Selection.standardTextLevelSemanticsComparator(rangeObject.splitObject, followUpContainer)) {
			jQuery(rangeObject.splitObject).remove();
		}

		// find a possible text node in the followUpContainer and set the selection to it
		// if no textnode is available, set the selection to the followup container itself
		rangeObject.startContainer = followUpContainer.textNodes(true, true).first().get(0);
		if (!rangeObject.startContainer) { // if no text node was found, select the parent object of <br class="aloha-ephemera" />
			rangeObject.startContainer = followUpContainer.textNodes(false).first().parent().get(0);
		}
		if (rangeObject.startContainer) {
			// the cursor is always at the beginning of the followUp
			rangeObject.endContainer = rangeObject.startContainer;
			rangeObject.startOffset = 0;
			rangeObject.endOffset = 0;
		} else {
			rangeObject.startContainer = rangeObject.endContainer = followUpContainer.parent().get(0);
			rangeObject.startOffset = rangeObject.endOffset = GENTICS.Utils.Dom.getIndexInParent(followUpContainer.get(0));
		}

		// finally update the range object again
		rangeObject.update();

		// now set the selection
		rangeObject.select();
	},

	/**
	 * method to get the object after which the followUpContainer can be inserted during splitup
	 * this is a helper method, not needed anywhere else
	 * @param rangeObject Aloha.Selection.SelectionRange of the current selection
	 * @param followUpContainer optional jQuery object; if provided the rangeObject will be split and the second part will be insert inside of this object
	 * @return object after which the followUpContainer can be inserted
	 */
	getInsertAfterObject: function(rangeObject, followUpContainer) {
		var passedSplitObject,i,el;
		
		for (i = 0; i < rangeObject.markupEffectiveAtStart.length; i++) {
			el = rangeObject.markupEffectiveAtStart[ i ];
			// check if we have already passed the splitObject (some other markup might come before)
			if (el === rangeObject.splitObject){
				passedSplitObject = true;
			}
			// if not passed splitObject, skip this markup
			if (!passedSplitObject) {
				continue;
			}
			// once we are passed, check if the followUpContainer is allowed to be inserted into the currents el's parent
			if (Aloha.Selection.canTag1WrapTag2(jQuery(el).parent()[0].nodeName, followUpContainer[0].nodeName)) {
				return el;
			}
		}
		return false;
	},

	/**
	 * method to get the html code for a fillUpElement. this is needed for empty paragraphs etc., so that they take up their expected height
	 * @param splitObject split object (dom object)
	 * @return fillUpElement HTML Code
	 */
	getFillUpElement: function(splitObject) {
		if (jQuery.browser.msie) {
			return false;
		} else {
			return jQuery('<br class="aloha-cleanme"/>');
		}
	},

	/**
	 * removes textNodes from passed array, which only contain contentWhiteSpace (e.g. a \n between two tags)
	 * @param domArray array of domObjects
	 * @return void
	 */
	removeElementContentWhitespaceObj: function(domArray) {
		var correction = 0,
			removeLater = [],
			i,
			el, removeIndex;
		
		for (i = 0; i < domArray.length; i++) {
			el = domArray[i];
			if (el.isElementContentWhitespace) {
				removeLater[removeLater.length] = i;
			}
		}

		for (i = 0; i < removeLater.length; i++) {
			removeIndex = removeLater[i];
			domArray.splice(removeIndex - correction, 1);
			correction++;
		}
	},

	/**
	 * recursive method to parallelly walk through two dom subtrees, leave elements before startContainer in first subtree and move rest to other
	 * @param selectionTree tree to iterate over as contained in rangeObject. must be passed separately to allow recursion in the selection tree, but not in the rangeObject
	 * @param rangeObject Aloha.Selection.SelectionRange of the current selection
	 * @param followUpContainer optional jQuery object; if provided the rangeObject will be split and the second part will be insert inside of this object
	 * @param inBetweenMarkup jQuery object to be inserted between the two split parts. will be either a <br> (if no followUpContainer is passed) OR e.g. a table, which must be inserted between the splitobject AND the follow up
	 * @return void
	 */
	splitRangeObjectHelper: function(selectionTree, rangeObject, followUpContainer, inBetweenMarkup) {
		if (!followUpContainer) {
			Aloha.Log.warn(this, 'no followUpContainer, no inBetweenMarkup, nothing to do...');
		}

		var fillUpElement = this.getFillUpElement(rangeObject.splitObject),
			splitObject = jQuery(rangeObject.splitObject),
			startMoving = false,
			el, i, completeText, jqObj, mirrorLevel, parent, treeLength;
		
		if (selectionTree.length > 0) {
			mirrorLevel = followUpContainer.contents();

			// if length of mirrorLevel and selectionTree are not equal, the mirrorLevel must be corrected. this happens, when the mirrorLevel contains whitespace textNodes
			if (mirrorLevel.length !== selectionTree.length) {
				this.removeElementContentWhitespaceObj(mirrorLevel);
			}

			// var originalLevel = jQuery(rangeObject.commonAncestorContainer).contents();
			for (i = 0, treeLength = selectionTree.length; i < treeLength; i++) {
				el = selectionTree[i];
				// remove all objects in the mirrorLevel, which are BEFORE the cursor
				// OR if the cursor is at the last position of the last Textnode (causing an empty followUpContainer to be appended)
				if (
						(el.selection === 'none' && startMoving === false) ||
						(el.domobj && el.domobj.nodeType === 3 && el === selectionTree[ (selectionTree.length-1) ] && el.startOffset === el.domobj.data.length)
				) {
					// iteration is before cursor, leave this part inside the splitObject, remove from followUpContainer
					// however if the object to remove is the last existing textNode within the followUpContainer, insert a BR instead
					// otherwise the followUpContainer is invalid and takes up no vertical space
					if (followUpContainer.textNodes().length > 1) {
						mirrorLevel.eq(i).remove();
					} else if (GENTICS.Utils.Dom.isSplitObject(followUpContainer[0])) {
						if (fillUpElement) {
							followUpContainer.html(fillUpElement); // for your zoological german knowhow: ephemera = Eintagsfliege
						} else {
							followUpContainer.empty();
						}
					} else {
						followUpContainer.empty();
						followUpContainer.addClass('preparedForRemoval');
					}
					continue;
				} else

					// split objects, which are AT the cursor Position or directly above
					if (el.selection !== 'none') { // before cursor, leave this part inside the splitObject
						// TODO better check for selection == 'partial' here?
						if (el.domobj && el.domobj.nodeType === 3 && el.startOffset !== undefined) {
							completeText = el.domobj.data;
							if (el.startOffset > 0) {// first check, if there will be some text left in the splitObject
								el.domobj.data = completeText.substr(0,el.startOffset);
							} else if (selectionTree.length > 1) { // if not, check if the splitObject contains more than one node, because then it can be removed. this happens, when ENTER is pressed inside of a textnode, but not at the borders
								jQuery(el.domobj).remove();
							} else { // if the "empty" textnode is the last node left in the splitObject, replace it with a ephemera break
								// if the parent is a blocklevel element, we insert the fillup element
								parent = jQuery(el.domobj).parent();
								if (GENTICS.Utils.Dom.isSplitObject(parent[0])) {
									if (fillUpElement) {
										parent.html(fillUpElement);
									} else {
										parent.empty();
									}
								} else {
									// if the parent is no blocklevel element and would be empty now, we completely remove it
									parent.remove();
								}
							}
							if (completeText.length - el.startOffset > 0) {
								// first check if there is text left to put in the followUpContainer's textnode. this happens, when ENTER is pressed inside of a textnode, but not at the borders
								mirrorLevel[i].data = completeText.substr(el.startOffset, completeText.length);
							} else if (mirrorLevel.length > 1) {
								// if not, check if the followUpContainer contains more than one node, because if yes, the "empty" textnode can be removed
								mirrorLevel.eq( (i) ).remove();
							} else if (GENTICS.Utils.Dom.isBlockLevelElement(followUpContainer[0])) {
								// if the "empty" textnode is the last node left in the followUpContainer (which is a blocklevel element), replace it with a ephemera break
								if (fillUpElement) {
									followUpContainer.html(fillUpElement);
								} else {
									followUpContainer.empty();
								}
							} else {
								// if the "empty" textnode is the last node left in a non-blocklevel element, mark it for removal
								followUpContainer.empty();
								followUpContainer.addClass('preparedForRemoval');
							}
						}
						startMoving = true;
						if (el.children.length > 0) {
							this.splitRangeObjectHelper(el.children, rangeObject, mirrorLevel.eq(i), inBetweenMarkup);
						}
					} else

						// remove all objects in the origien, which are AFTER the cursor
						if (el.selection === 'none' && startMoving === true) {
							// iteration is after cursor, remove from splitObject and leave this part inside the followUpContainer
							jqObj = jQuery(el.domobj).remove();
						}
			}
		} else {
			Aloha.Log.error(this, 'can not split splitObject due to an empty selection tree');
		}

		// and finally cleanup: remove all fillUps > 1
		splitObject.find('br.aloha-ephemera:gt(0)').remove(); // remove all elements greater than (gt) 0, that also means: leave one
		followUpContainer.find('br.aloha-ephemera:gt(0)').remove(); // remove all elements greater than (gt) 0, that also means: leave one

		// remove objects prepared for removal
		splitObject.find('.preparedForRemoval').remove();
		followUpContainer.find('.preparedForRemoval').remove();

		// if splitObject / followUp are empty, place a fillUp inside
		if (splitObject.contents().length === 0 && GENTICS.Utils.Dom.isSplitObject(splitObject[0]) && fillUpElement) {
			splitObject.html(fillUpElement);
		}
		if (followUpContainer.contents().length === 0 && GENTICS.Utils.Dom.isSplitObject(followUpContainer[0]) && fillUpElement) {
			followUpContainer.html(fillUpElement);
		}
	},

	/**
	 * returns a jQuery object fitting the passed splitObject as follow up object
	 * examples,
	 * - when passed a p it will return an empty p (clone of the passed p)
	 * - when passed an h1, it will return either an h1 (clone of the passed one) or a new p (if the collapsed selection was at the end)
	 * @param rangeObject Aloha.RangeObject
	 * @return void
	 */
	getSplitFollowUpContainer: function(rangeObject) {
		var
			tagName = rangeObject.splitObject.nodeName.toLowerCase(),
			returnObj, inside, lastObj;

		switch(tagName) {
			case 'h1':
			case 'h2':
			case 'h3':
			case 'h4':
			case 'h5':
			case 'h6':
				lastObj = jQuery(rangeObject.splitObject).textNodes().last()[0];
				// special case: when enter is hit at the end of a heading, the followUp should be a <p>
				if (lastObj && rangeObject.startContainer === lastObj && rangeObject.startOffset === lastObj.length) {
					returnObj = jQuery('<p></p>');
					inside = jQuery(rangeObject.splitObject).clone().contents();
					returnObj.append(inside);
					return returnObj;
				}
				break;

			case 'li':
				// TODO check whether the li is the last one
				// special case: if enter is hit twice inside a list, the next item should be a <p> (and inserted outside the list)
				if (rangeObject.startContainer.nodeName.toLowerCase() === 'br' && jQuery(rangeObject.startContainer).hasClass('aloha-ephemera')) {
					returnObj = jQuery('<p></p>');
					inside = jQuery(rangeObject.splitObject).clone().contents();
					returnObj.append(inside);
					return returnObj;
				}
				// when the li is the last one and empty, we also just return a <p>
				if (!rangeObject.splitObject.nextSibling && jQuery.trim(jQuery(rangeObject.splitObject).text()).length === 0) {
					returnObj = jQuery('<p></p>');
					return returnObj;
				}
		}

		return jQuery(rangeObject.splitObject).clone();
	},

	/**
	 * Transform the given domobj into an object with the given new nodeName.
	 * Preserves the content and all attributes
	 * @param domobj dom object to transform
	 * @parma nodeName new node name
	 * @api
	 * @return new object as jQuery object
	 */
	transformDomObject: function (domobj, nodeName) {
		// first create the new element
		var
			jqOldObj = jQuery(domobj),
			jqNewObj = jQuery('<' + nodeName + '></' + nodeName + '>'),
			i;

		// TODO what about events? css properties?

		// copy attributes
		if (jqOldObj[0].attributes) {
			for (i = 0; i < jqOldObj[0].attributes.length; i++) {
				jqNewObj.attr(jqOldObj[0].attributes[i].nodeName, jqOldObj[0].attributes[i].nodeValue);
			}
		}
		// copy inline CSS
		jqNewObj[0].style.cssText = jqOldObj[0].style.cssText;

		// now move the contents of the old dom object into the new dom object
		jqOldObj.contents().appendTo(jqNewObj);

		// finally replace the old object with the new one
		jqOldObj.replaceWith(jqNewObj);

		return jqNewObj;
	},

	/**
	 * String representation
	 * @return "Aloha.Selection"
	 */
	toString: function() {
		return 'Aloha.Markup';
	}
});

Aloha.Markup = new Aloha.Markup();

})(window);