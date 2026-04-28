class Medicine {
  final String id;
  final String name;
  final String dosage;
  final String time;
  final int totalQuantity;
  final int remainingQuantity;

  Medicine({
    required this.id,
    required this.name,
    required this.dosage,
    required this.time,
    required this.totalQuantity,
    required this.remainingQuantity,
  });

  factory Medicine.fromJson(Map<String, dynamic> json, String id) {
    return Medicine(
      id: id,
      name: json['name'] as String,
      dosage: json['dosage'] as String,
      time: json['time'] as String,
      totalQuantity: json['totalQuantity'] as int,
      remainingQuantity: json['remainingQuantity'] as int,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'dosage': dosage,
      'time': time,
      'totalQuantity': totalQuantity,
      'remainingQuantity': remainingQuantity,
    };
  }
}
