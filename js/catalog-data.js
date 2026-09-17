/* =========================================================
   PROJECTKART
   Local catalogue fallback
   Used when Firebase is unavailable or empty so public pages
   still render products, categories and kits.
   ========================================================= */

export const FALLBACK_CATEGORIES = [
    {
        id: "arduino-boards",
        name: "Arduino & Boards",
        description: "Microcontrollers and connected brains for every build.",
        image: "assets/images/categories/arduino-boards.jpg",
        order: 1,
        active: true
    },
    {
        id: "sensors",
        name: "Sensors",
        description: "Give your projects the ability to sense the world.",
        image: "assets/images/categories/sensors.jpg",
        order: 2,
        active: true
    },
    {
        id: "modules",
        name: "Modules",
        description: "Plug-and-play building blocks for fast prototypes.",
        image: "assets/images/categories/modules.jpg",
        order: 3,
        active: true
    },
    {
        id: "batteries-power",
        name: "Batteries & Power",
        description: "Reliable power options for portable and embedded ideas.",
        image: "assets/images/categories/batteries-power.jpg",
        order: 4,
        active: true
    },
    {
        id: "motors-robotics",
        name: "Motors & Robotics",
        description: "Movement, mechanisms and the parts that make robots go.",
        image: "assets/images/categories/motors-robotics.jpg",
        order: 5,
        active: true
    },
    {
        id: "displays",
        name: "Displays",
        description: "Make data visible with bright, compact interfaces.",
        image: "assets/images/categories/displays.jpg",
        order: 6,
        active: true
    },
    {
        id: "wires-connectors",
        name: "Wires & Connectors",
        description: "The small essentials that connect your whole system.",
        image: "assets/images/categories/wires-connectors.jpg",
        order: 7,
        active: true
    },
    {
        id: "prototyping",
        name: "Prototyping",
        description: "Breadboards and boards that make iteration effortless.",
        image: "assets/images/categories/prototyping.jpg",
        order: 8,
        active: true
    },
    {
        id: "components",
        name: "Components",
        description: "Resistors, LEDs, switches and the essential building blocks.",
        image: "assets/images/categories/components.jpg",
        order: 9,
        active: true
    },
    {
        id: "project-kits",
        name: "Project Kits",
        description: "Curated starting points for real-world projects.",
        image: "assets/images/categories/project-kits.jpg",
        order: 10,
        active: true
    }
];

export const FALLBACK_PRODUCTS = [
    {
        id: "arduino-uno-r3",
        name: "Arduino UNO R3",
        description: "The dependable starting point for prototypes, classroom builds and maker experiments.",
        price: 699,
        oldPrice: 799,
        image: "assets/images/products/arduino-uno-r3.jpg",
        categoryId: "arduino-boards",
        categoryName: "Arduino",
        badge: "POPULAR",
        stock: 24,
        featured: true,
        deal: true,
        active: true
    },
    {
        id: "arduino-nano",
        name: "Arduino Nano",
        description: "A compact ATmega328P board for projects where every millimetre matters.",
        price: 449,
        image: "assets/images/products/arduino-nano.jpg",
        categoryId: "arduino-boards",
        categoryName: "Arduino",
        stock: 30,
        featured: true,
        active: true
    },
    {
        id: "esp32",
        name: "ESP32 Wi-Fi + Bluetooth",
        description: "A versatile dual-core board for connected devices, automation and IoT prototypes.",
        price: 549,
        oldPrice: 649,
        image: "assets/images/products/esp32.jpg",
        categoryId: "arduino-boards",
        categoryName: "IoT Boards",
        badge: "NEW",
        stock: 18,
        featured: true,
        deal: true,
        active: true
    },
    {
        id: "hc-sr04",
        name: "HC-SR04 Ultrasonic Sensor",
        description: "A practical distance sensor for obstacle detection, parking aids and robotics.",
        price: 89,
        oldPrice: 120,
        image: "assets/images/products/hc-sr04.jpg",
        categoryId: "sensors",
        categoryName: "Distance",
        badge: "SALE",
        stock: 40,
        featured: true,
        deal: true,
        active: true
    },
    {
        id: "flex-sensor",
        name: "Flex Sensor 2.2 inch",
        description: "Measure bending and gesture input for wearables, controllers and interactive builds.",
        price: 299,
        image: "assets/images/products/flex-sensor.jpg",
        categoryId: "sensors",
        categoryName: "Motion & Flex",
        badge: "LIMITED STOCK",
        stock: 9,
        featured: true,
        active: true
    },
    {
        id: "sg90-servo",
        name: "SG90 Micro Servo Motor",
        description: "Lightweight 180° servo for pan-tilt mechanisms, arms and moving prototypes.",
        price: 149,
        oldPrice: 179,
        image: "assets/images/products/sg90-servo.jpg",
        categoryId: "motors-robotics",
        categoryName: "Servo Motors",
        stock: 50,
        featured: true,
        deal: true,
        active: true
    },
    {
        id: "oled-096",
        name: "0.96 inch OLED Display",
        description: "Crisp I2C OLED display for compact dashboards, sensors and device interfaces.",
        price: 189,
        image: "assets/images/products/oled-096.jpg",
        categoryId: "displays",
        categoryName: "OLED",
        stock: 22,
        featured: true,
        active: true
    },
    {
        id: "l298n",
        name: "L298N Motor Driver",
        description: "Dual H-bridge motor controller for two DC motors or one stepper motor.",
        price: 169,
        image: "assets/images/products/l298n.jpg",
        categoryId: "motors-robotics",
        categoryName: "Motor Drivers",
        stock: 16,
        featured: true,
        active: true
    },
    {
        id: "jumper-wire-kit",
        name: "Jumper Wire Kit",
        description: "Male-male, male-female and female-female leads for fast prototyping.",
        price: 129,
        image: "assets/images/products/jumper-wire-kit.jpg",
        categoryId: "wires-connectors",
        categoryName: "Jumper Wires",
        stock: 60,
        featured: true,
        active: true
    },
    {
        id: "relay-1ch",
        name: "1-Channel Relay Module",
        description: "Switch higher-voltage loads from a microcontroller with an easy-to-use relay.",
        price: 79,
        image: "assets/images/products/relay-1ch.jpg",
        categoryId: "modules",
        categoryName: "Relay",
        stock: 45,
        featured: true,
        active: true
    },
    {
        id: "rfid-rc522",
        name: "RFID RC522 Module",
        description: "13.56 MHz RFID reader for access, identity and smart interaction projects.",
        price: 139,
        image: "assets/images/products/rfid-rc522.jpg",
        categoryId: "modules",
        categoryName: "Communication",
        stock: 28,
        featured: true,
        active: true
    },
    {
        id: "hc-05",
        name: "Bluetooth HC-05 Module",
        description: "Classic Bluetooth serial module for wireless control and data projects.",
        price: 229,
        image: "assets/images/products/hc-05.jpg",
        categoryId: "modules",
        categoryName: "Communication",
        stock: 20,
        featured: true,
        active: true
    },
    {
        id: "breadboard-830",
        name: "830 Point Breadboard",
        description: "Solderless breadboard for rapid circuit iteration without committing to a PCB.",
        price: 99,
        image: "assets/images/categories/prototyping.jpg",
        categoryId: "prototyping",
        categoryName: "Prototyping",
        stock: 35,
        featured: false,
        active: true
    },
    {
        id: "dht11",
        name: "DHT11 Temperature Humidity Sensor",
        description: "Simple digital sensor for classroom weather stations and climate projects.",
        price: 79,
        image: "assets/images/categories/sensors.jpg",
        categoryId: "sensors",
        categoryName: "Environment",
        stock: 42,
        featured: false,
        active: true
    },
    {
        id: "lcd-1602",
        name: "16x2 LCD Display",
        description: "Character LCD for status text, menus and compact device interfaces.",
        price: 159,
        image: "assets/images/categories/displays.jpg",
        categoryId: "displays",
        categoryName: "LCD",
        stock: 19,
        featured: false,
        active: true
    },
    {
        id: "9v-battery-clip",
        name: "9V Battery Clip",
        description: "Reliable clip lead for powering small prototypes and portable builds.",
        price: 39,
        image: "assets/images/categories/batteries-power.jpg",
        categoryId: "batteries-power",
        categoryName: "Power",
        stock: 80,
        featured: false,
        active: true
    }
];

export const FALLBACK_KITS = [
    {
        id: "smart-home",
        name: "Smart Home Kit",
        description: "Automate lights, sensors and alerts with a guided smart-home build.",
        image: "assets/images/kits/smart-home-kit.jpg",
        difficulty: "Intermediate",
        price: 2499,
        order: 1,
        featured: true,
        active: true
    },
    {
        id: "obstacle-robot",
        name: "Obstacle Avoiding Robot",
        description: "Build a robot that senses and steers around objects in its path.",
        image: "assets/images/kits/obstacle-robot.jpg",
        difficulty: "Intermediate",
        price: 1899,
        order: 2,
        featured: true,
        active: true
    },
    {
        id: "line-following-robot",
        name: "Line Following Robot",
        description: "An advanced kit for line tracking, motor control and sensor tuning.",
        image: "assets/images/kits/line-following-robot.jpg",
        difficulty: "Advanced",
        price: 2199,
        order: 3,
        featured: true,
        active: true
    }
];
