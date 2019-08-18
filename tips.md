
# Display component's callbacks

### _onRenderResize
### onLanguageChanged

### _onDisableByTrigger
called when parent trigger come disabled


## Editor mode callbacks. Wrap code which acces it in to next macros coments: 
```
///#if EDITOR

/// #endif
```

### __EDITOR_onCreate  
called after object created via class-view additng to stage

### __onSelect() { super.__onSelect(); }
### __onUnselect


### __beforeDestroy
chance do destroy content in editor mode. For cases when onRemove is not calling because of init was not called in editor mode

### __beforeSerialization
### __afterSerialization
### __beforeDeserialization
### __afterDeserialization

### __goToPreviewMode
### __exitPreviewMode
should be binded to this
this.__exitPreviewMode = this.__exitPreviewMode.bind(this);

###__onChildSelected


---

# Editable fields description options:

### type:
 Number, String, Boolean, 'rect', 'data-path', 'callback', 'btn', 'color', 'splitter', 'ref'
 //'ref' fields used to null reference at reusing object from pool. If reference used in property setter, such reference could be not cleared before first property set. So you should null such references in onRemove method
 //'btn' could has additionbal 'title' (tooltip), 'hotkey' properties

### title:
 readable name for group header

### name:
 object's editable property name
  // begin name with '__' to make field exist in editor only
        such field will not be included in to build.
  // begin name with '___' to make field exist in editor memory only
        such field will not be saved in to any file.

### default:
 defaultValue

### min, max, step:
 optional for Number property

 nullable,rotable,noscalable,minX,maxX,minY,maxY,minW,maxW,minH,maxH - additionally supported for 'rect' fields

### basis:
 optional for Number property
 defines basis for representing value in property editor

### select:
array of {name: 'Readable Name', value: 1} objects to select values from ad drop-down list

### disabled:
 function(selectedObject) {
    return true if field is readonly
 }

### notSeriazable:
 true - if not need save it in to data. Useful for editor helpers fierlds.

### important:
 true - if field should be highlighted in editor

### override:
 true - if field with same name already registered in super class, and need to redefine its appearance

### visible:
 function(selected object) {
   retur false if field should be hidden.
 }

### validate:
 function(val) {
   return 'return message if invalid.'
 }

### parser:
 function(val) {
   return parsed/changed Val.
 }

### isValueValid:
 function(val) { // validator fot path selector ('data-path', 'callback')
   return true if value is valid as target for 'data-path'.
 }

 add __EDITOR_isHiddenForChooser = true; for any object or field to make it invisible for data path chooser
 add __EDITOR_isHiddenForCallbackChooser = true; for any object or field to make it invisible for callback path chooser
 add __EDITOR_isHiddenForDataChooser = true; for any object or field to make it invisible for data path chooser
 add __EDITOR_isGoodForChooser = true; for any object or field to make it higlighted in path chooser
 add __EDITOR_isGoodForCallbackChooser = true; for any object or field to make it higlighted in callback chooser
 add __EDITOR_ChooserOrder = 20; to make field or objects priority in data pant chooser

### onClick:
 function(selectedObject) {
   click handler for 'btn' property
 }

### noNullCheck:
 true - if numeric value does not need NaN checking

### tip:
 'Tip text'

### afterEdited(o):
  callback called after property edited by user;


# Editor extendedData
## __getNodeExtendData(displayObject)
get extended data. Available in editor only

## extendedData's flags:

### isSelected
### hidePropsEditor
do not show props editor. Object still can be dragged or rotated

### rotatorLocked
dont show rotation drag point

### hidden
hide in scene's tree

### __EDITOR_isPreviewObject
 //(read only) true if object is prefab which currently opened to edit