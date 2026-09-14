export interface LanguageDef {
  id: string;
  compilerId: string;
  label: string;
  icon: string;
  monacoLanguage: string;
  fileName: string;
  template: string;
}

// Every entry here was verified with a real "Hello, World!" run against
// Compiler Explorer's (https://godbolt.org) public execute API, including
// the quirks some of these needed (Java's public class must be un-public
// since the source isn't literally named Main.java; Zig's std.io.getStdOut
// writer instead of std.debug.print, which goes to stderr; Objective-C
// without <Foundation/Foundation.h>, which isn't installed on this compiler
// build). A handful of languages Compiler Explorer lists (Erlang, Nim,
// Scala, Clojure) were tested and dropped — their execution step is broken
// on this backend regardless of source (missing binaries / runtime
// classpath), independent of anything in this app.
export const languages: LanguageDef[] = [
  {
    id: 'c',
    compilerId: 'cg151',
    label: 'C',
    icon: 'C',
    monacoLanguage: 'c',
    fileName: 'main.c',
    template: `#include <stdio.h>

int main(void) {
    printf("Hello, World!\\n");
    return 0;
}
`,
  },
  {
    id: 'cpp',
    compilerId: 'g162',
    label: 'C++',
    icon: 'C++',
    monacoLanguage: 'cpp',
    fileName: 'main.cpp',
    template: `#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
`,
  },
  {
    id: 'csharp',
    compilerId: 'dotnet90csharpcoreclr',
    label: 'C#',
    icon: '#',
    monacoLanguage: 'csharp',
    fileName: 'Main.cs',
    template: `using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
    }
}
`,
  },
  {
    id: 'java',
    compilerId: 'java2501',
    label: 'Java',
    icon: '☕',
    monacoLanguage: 'java',
    fileName: 'Main.java',
    template: `class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`,
  },
  {
    id: 'kotlin',
    compilerId: 'kotlinc2220',
    label: 'Kotlin',
    icon: '🎯',
    monacoLanguage: 'kotlin',
    fileName: 'main.kt',
    template: `fun main() {
    println("Hello, World!")
}
`,
  },
  {
    id: 'python3',
    compilerId: 'python314',
    label: 'Python',
    icon: '🐍',
    monacoLanguage: 'python',
    fileName: 'main.py',
    template: `print("Hello, World!")\n`,
  },
  {
    id: 'ruby',
    compilerId: 'ruby347',
    label: 'Ruby',
    icon: '💎',
    monacoLanguage: 'ruby',
    fileName: 'main.rb',
    template: `puts "Hello, World!"\n`,
  },
  {
    id: 'perl',
    compilerId: 'perl5440',
    label: 'Perl',
    icon: '🐪',
    monacoLanguage: 'perl',
    fileName: 'main.pl',
    template: `print "Hello, World!\\n";\n`,
  },
  {
    id: 'lua',
    compilerId: 'lua550',
    label: 'Lua',
    icon: '🌙',
    monacoLanguage: 'lua',
    fileName: 'main.lua',
    template: `print("Hello, World!")\n`,
  },
  {
    id: 'go',
    compilerId: 'gl1260',
    label: 'Go',
    icon: '🐹',
    monacoLanguage: 'go',
    fileName: 'main.go',
    template: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
`,
  },
  {
    id: 'rust',
    compilerId: 'r1980',
    label: 'Rust',
    icon: '🦀',
    monacoLanguage: 'rust',
    fileName: 'main.rs',
    template: `fn main() {
    println!("Hello, World!");
}
`,
  },
  {
    id: 'swift',
    compilerId: 'swift633',
    label: 'Swift',
    icon: '🍎',
    monacoLanguage: 'swift',
    fileName: 'main.swift',
    template: `print("Hello, World!")\n`,
  },
  {
    id: 'objective-c',
    compilerId: 'objcg650',
    label: 'Objective-C',
    icon: '🍏',
    monacoLanguage: 'objective-c',
    fileName: 'main.m',
    template: `#import <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`,
  },
  {
    id: 'd',
    compilerId: 'dmd21120',
    label: 'D',
    icon: 'D',
    monacoLanguage: 'plaintext',
    fileName: 'main.d',
    template: `import std.stdio;

void main() {
    writeln("Hello, World!");
}
`,
  },
  {
    id: 'haskell',
    compilerId: 'ghc9122',
    label: 'Haskell',
    icon: 'λ',
    monacoLanguage: 'plaintext',
    fileName: 'main.hs',
    template: `main = putStrLn "Hello, World!"\n`,
  },
  {
    id: 'ocaml',
    compilerId: 'ocaml5200',
    label: 'OCaml',
    icon: '🐫',
    monacoLanguage: 'plaintext',
    fileName: 'main.ml',
    template: `print_endline "Hello, World!"\n`,
  },
  {
    id: 'pascal',
    compilerId: 'fpc322',
    label: 'Pascal',
    icon: 'P',
    monacoLanguage: 'pascal',
    fileName: 'main.pas',
    template: `program Hello;
begin
  writeln('Hello, World!');
end.
`,
  },
  {
    id: 'ada',
    compilerId: 'gnat162',
    label: 'Ada',
    icon: 'A',
    monacoLanguage: 'plaintext',
    fileName: 'main.adb',
    template: `with Ada.Text_IO; use Ada.Text_IO;
procedure Main is
begin
   Put_Line("Hello, World!");
end Main;
`,
  },
  {
    id: 'dart',
    compilerId: 'dart373',
    label: 'Dart',
    icon: '🎯',
    monacoLanguage: 'dart',
    fileName: 'main.dart',
    template: `void main() {
  print('Hello, World!');
}
`,
  },
  {
    id: 'crystal',
    compilerId: 'crystal1203',
    label: 'Crystal',
    icon: '💠',
    monacoLanguage: 'plaintext',
    fileName: 'main.cr',
    template: `puts "Hello, World!"\n`,
  },
  {
    id: 'julia',
    compilerId: 'julia_1_12_5',
    label: 'Julia',
    icon: '🔴',
    monacoLanguage: 'julia',
    fileName: 'main.jl',
    template: `println("Hello, World!")\n`,
  },
  {
    id: 'zig',
    compilerId: 'z0110',
    label: 'Zig',
    icon: '⚡',
    monacoLanguage: 'plaintext',
    fileName: 'main.zig',
    template: `const std = @import("std");

pub fn main() !void {
    const stdout = std.io.getStdOut().writer();
    try stdout.print("Hello, World!\\n", .{});
}
`,
  },
  {
    id: 'cobol',
    compilerId: 'gcccobol162',
    label: 'COBOL',
    icon: '🏦',
    monacoLanguage: 'plaintext',
    fileName: 'main.cob',
    template: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. HELLO.
       PROCEDURE DIVISION.
           DISPLAY "Hello, World!".
           STOP RUN.
`,
  },
  {
    id: 'fsharp',
    compilerId: 'dotnet90fsharpcoreclr',
    label: 'F#',
    icon: 'F#',
    monacoLanguage: 'fsharp',
    fileName: 'main.fsx',
    template: `printfn "Hello, World!"\n`,
  },
  {
    id: 'vb',
    compilerId: 'dotnet90vbcoreclr',
    label: 'Visual Basic .NET',
    icon: 'VB',
    monacoLanguage: 'vb',
    fileName: 'main.vb',
    template: `Module Program
    Sub Main()
        Console.WriteLine("Hello, World!")
    End Sub
End Module
`,
  },
];

export const defaultLanguageId = 'c';

export function getLanguage(id: string | undefined): LanguageDef | undefined {
  return languages.find((l) => l.id === id);
}
