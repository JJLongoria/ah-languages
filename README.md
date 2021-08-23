# **Aura Helper Languages Modules**
Aura Helper Languages Module has usefull inner modules to work with all supported Salesforce languages (Apex, Javascript, Aura...)

You can Tokenize and Parse any apex class to get data from classes like name, variables, methods, constructors... Also you can format your apex classes using the Apex Formatter class

Like Apex classes, you can Tokenize and Parse XML Aura Files and Aura Javascript files with Aura and Javascript modules.

To parse any XML file to process it, you can use the XML Module and its classes to parse prepare and process any XML File.

The languages module has a system module too, to get System apex classes data or Lightning Aura componetns defined on salesforce.

---

## *Table of Contents*

- [**Apex Module**](#apex-module)
  - [**ApexTokenizer Class**](#apex-module-tokenizer-class)
  - [**ApexParser Class**](#apex-module-parser-class)
  - [**ApexFormatter Class**](#apex-module-formatter-class)

</br>

- [**Aura Module**](#aura-module)
  - [**AuraTokenizer Class**](#aura-module-tokenizer-class)
  - [**AuraParser Class**](#aura-module-parser-class)

</br>

- [**Javascript Module**](#javascript-module)
  - [**JSTokenizer Class**](#javascript-module-tokenizer-class)
  - [**JSParser Class**](#javascript-module-parser-class)

</br>

- [**XML Module**](#xml-module)
  - [**XMLUtils Class**](#xml-module-xmlutils-class)
  - [**XMLParser Class**](#xml-module-parser-class)

</br>

- [**System Module**](#system-module)
  - [**System Class**](#system-module-system-class)


---
# [**Apex Module**](#apex-module)
Module with classes to tokenize Apex Classes or Parse Apex Classes to extract classes data like variables, fields, methods, constructors...

# [**ApexTokenizer Class**](#apex-module-tokenizer-class)

# [**Methods**](#apex-module-tokenizer-class-methods)

---
# [**ApexParser Class**](#apex-module-parser-class)

# [**Methods**](#apex-module-parser-class-methods)

---
# [**ApexFormatter Class**](#apex-module-formatter-class)
Class to format any Apex Class with a selected configuration to format code as you want
# [**Methods**](#apex-module-formatter-class-methods)

- [**config()**](#config)

    Method to get a default formatter config object

- [**format(pathContentOrTokens, config)**](#formatpathcontentortokens-config)

    Method to format an Apex Class with the selected options

---
## [**config()**](#config)
Method to get a default formatter config object

### **Return:**
Returns a default formatter config object
- ApexFormatterConfig

### **Examples:**
**Get default apex formatter config**

    const { Apex } = require('@ah/languages');
    const ApexFormatter = Apex.ApexFormatter;

    const config = ApexFormatter.config();

    console.log(config);

---
## [**format(pathContentOrTokens, config)**](#formatpathcontentortokens-config)
Method to format an Apex Class with the selected options

### **Parameters:**
  - **pathContentOrTokens**: Class file path or String file content or Apex Class Tokens (Use ApexTokenizer)
    - String | Array\<Token\> 
  - **config**: Apex formatter config object or VSCode Config JSON object
    - ApexFormatterConfig | Object
  - **systemData**: System data like System Apex Classes or Namespaces to tokenize apex class if pathContentOrTokens is a class content or file path because is used to tokenize with precission. Can get it with System Class from System Module
    - Object

### **Return:**
Returns the Apex Class content formatted
- String

### **Throws:**
This method can throw the next exceptions:

- **WrongDatatypeException**: If pathContentOrTokens datatype is not an String, path or file tokens
- **WrongFilePathException**: If the file Path is not a String or can't convert to absolute path
- **FileNotFoundException**: If the file not exists or not have access to it
- **InvalidFilePathException**: If the path is not a file
- 
### **Examples:**
**Format apex class from file**

    const { Apex, System } = require('@ah/languages');
    const ApexFormatter = Apex.ApexFormatter;

    const filePath = 'path/to/apexClass.cls';
    const formatedClassStr = ApexFormatter.format(filePath);

    console.log(formatedClassStr);

**Format apex class from file content**

    const { Apex } = require('@ah/languages');
    const ApexFormatter = Apex.ApexFormatter;

    const fileContent = 'public class ApexclassName {' + 
                            'private String property1 { get; set; }' + 
                            'private void privateMethod(String param1, Integer param2) {' + 
                                '// Method body' + 
                            '}';
                            'public String publicMethod(Map<String, List<Account>>) {' + 
                                '// Method body' + 
                            '}' +
                        '}';
    const formatedClassStr = ApexFormatter.format(fileContent);

    console.log(formatedClassStr);

**Format apex class from file tokens**

    const { Apex } = require('@ah/languages');
    const ApexFormatter = Apex.ApexFormatter;
    const ApexTokenizer = Apex.ApexTokenizer;

    const filePath = 'path/to/apexClass.cls';
    const fileTokens = ApexTokenizer.tokenize(filePath);
    const formatedClassStr = ApexFormatter.format(fileTokens);

    console.log(formatedClassStr);
---

</br>

--- 

# [**Aura Module**](#aura-module)
Module with classes to tokenize Aura XML Files or Parse Aura XML Files to extract data from applications, components or events like RegisteredEvents, Handlers, Attributes...

# [**AuraTokenizer Class**](#aura-module-tokenizer-class)

# [**Methods**](#aura-module-tokenizer-class-methods)

---
# [**AuraParser Class**](#aura-module-parser-class)

# [**Methods**](#aura-module-parser-class-methods)

---

</br>

--- 

# [**Javascript Module**](#javascript-module)
Module with classes to tokenize Aura JS Files or Parse Aura JS Files to extract methods data from Controller and Helper files

# [**JSTokenizer Class**](#javascript-module-tokenizer-class)

# [**Methods**](#javascript-module-tokenizer-class-methods)

---
# [**JSParser Class**](#javascript-module-parser-class)

# [**Methods**](#javascript-module-parser-class-methods)

---

</br>

--- 

# [**XML Module**](#xml-module)
Module with classes to parse any XML file to extract data and process it

# [**XMLUtils Class**](#xml-module-xmlutils-class)

# [**Methods**](#xml-module-xmlutils-class-methods)

---
# [**XMLParser Class**](#xml-module-parser-class)

# [**Methods**](#xml-module-parser-class-methods)

---

</br>

--- 

# [**System Module**](#system-module)
Module with one class and to many JSON files with Salesforce System Apex Classes and Namespaces and System Aura Components from all Namespaces (aura, lightning, ui...). Use the system class to get this data.

# [**System Class**](#system-module-system-class)

# [**Methods**](#system-module-system-class-methods)
